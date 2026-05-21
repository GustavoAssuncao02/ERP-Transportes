import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Power, RotateCcw, Save, Search, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import useAutoClearMessage from '../hooks/useAutoClearMessage.js';
import { navigationItems } from '../data/siteData.js';
import { normalizeText } from '../data/financeData.js';
import { auditActions, recordAuditEvent } from '../services/auditLog.js';
import { readJsonStorage, writeJsonStorage } from '../utils/storage.js';

const userStorageKey = 'systemUserManagementUsers';
const currentAdminUsername = 'camila.aguiar';

const sectorOptions = [
  'Administrativo',
  'Financeiro',
  'Fiscal',
  'Operação',
  'Gestão',
  'Recursos Humanos',
  'Tecnologia',
];

const roleOptions = ['Admin', 'Usuário'];
const statusOptions = ['Ativo', 'Inativo'];

function collectAccessOptions(items, parents = []) {
  return items.flatMap((item) => {
    const nextParents = [...parents, item.label];

    if (item.children) {
      return collectAccessOptions(item.children, nextParents);
    }

    if (!item.pageId) return [];

    return [{
      pageId: item.pageId,
      label: item.label,
      menuPath: parents.length ? parents.join(' / ') : item.label,
      searchableText: normalizeText(`${item.label} ${parents.join(' ')}`),
    }];
  });
}

function createAccessNode(item, parents = []) {
  const childNodes = item.children
    ? item.children.map((child) => createAccessNode(child, [...parents, item.label])).filter(Boolean)
    : [];
  const childPageIds = childNodes.flatMap((child) => child.pageIds);
  const pageIds = [...(item.pageId ? [item.pageId] : []), ...childPageIds];

  if (!pageIds.length) return null;

  const menuPath = parents.length ? parents.join(' / ') : item.label;

  return {
    id: item.id,
    label: item.label,
    pageId: item.pageId || null,
    pageIds,
    menuPath,
    children: childNodes,
    searchableText: normalizeText(`${item.label} ${menuPath} ${childNodes.map((child) => child.searchableText).join(' ')}`),
  };
}

function filterAccessNodes(nodes, query) {
  if (!query) return nodes;

  return nodes.reduce((filteredNodes, node) => {
    const filteredChildren = filterAccessNodes(node.children || [], query);

    if (node.searchableText.includes(query) || filteredChildren.length) {
      filteredNodes.push({
        ...node,
        children: filteredChildren.length ? filteredChildren : node.children,
      });
    }

    return filteredNodes;
  }, []);
}

const accessOptions = collectAccessOptions(navigationItems);
const accessGroups = navigationItems.map((item) => createAccessNode(item)).filter(Boolean);
const allAccessPageIds = accessOptions.map((option) => option.pageId);

const defaultSystemUsers = [
  {
    id: 'USR-134',
    firstName: 'Camila',
    lastName: 'Aguiar',
    username: currentAdminUsername,
    sector: 'Administrativo',
    role: 'Admin',
    status: 'Ativo',
    mustChangePassword: false,
    temporaryPassword: '',
    hasSystemActivity: true,
    activityCount: 28,
    activitySummary: 'Administração do sistema e cadastros operacionais',
    accessPageIds: allAccessPageIds,
  },
  {
    id: 'USR-205',
    firstName: 'Joao',
    lastName: 'Santos',
    username: 'joao.santos',
    sector: 'Operação',
    role: 'Usuário',
    status: 'Ativo',
    mustChangePassword: false,
    temporaryPassword: '',
    hasSystemActivity: true,
    activityCount: 14,
    activitySummary: 'Emissões e manifestos cadastrados',
    accessPageIds: ['issue-cte', 'collection-order', 'create-minuta', 'generate-manifest', 'fleet-management', 'warehouse-management'],
  },
  {
    id: 'USR-311',
    firstName: 'Marina',
    lastName: 'Costa',
    username: 'marina.costa',
    sector: 'Financeiro',
    role: 'Usuário',
    status: 'Ativo',
    mustChangePassword: true,
    temporaryPassword: '1234',
    hasSystemActivity: true,
    activityCount: 9,
    activitySummary: 'Lançamentos financeiros vinculados',
    accessPageIds: ['registered-launches', 'accounts-payable', 'accounts-payable-report', 'accounts-payable-settlement', 'accounts-receivable-dashboard'],
  },
  {
    id: 'USR-418',
    firstName: 'Teste',
    lastName: 'Treinamento',
    username: 'teste.treinamento',
    sector: 'Gestão',
    role: 'Usuário',
    status: 'Inativo',
    mustChangePassword: true,
    temporaryPassword: '1234',
    hasSystemActivity: false,
    activityCount: 0,
    activitySummary: '',
    accessPageIds: ['warehouse-management'],
  },
];

function normalizeUsername(value) {
  return normalizeText(value)
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');
}

function buildUsername(firstName, lastName) {
  return normalizeUsername(`${firstName}.${lastName}`);
}

function normalizeAccessPageIds(accessPageIds, role) {
  if (role === 'Admin') return allAccessPageIds;

  return [...new Set(Array.isArray(accessPageIds) ? accessPageIds : [])]
    .filter((pageId) => allAccessPageIds.includes(pageId));
}

function normalizeUser(user, index = 0) {
  const role = user.role === 'Usuario' ? 'Usuário' : roleOptions.includes(user.role) ? user.role : 'Usuário';

  return {
    id: user.id || `USR-${Date.now()}-${index}`,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    username: normalizeUsername(user.username || buildUsername(user.firstName || '', user.lastName || '')),
    sector: sectorOptions.includes(user.sector) ? user.sector : sectorOptions[0],
    role,
    status: statusOptions.includes(user.status) ? user.status : 'Ativo',
    mustChangePassword: Boolean(user.mustChangePassword),
    temporaryPassword: user.temporaryPassword || '',
    hasSystemActivity: Boolean(user.hasSystemActivity || Number(user.activityCount) > 0),
    activityCount: Number(user.activityCount) || 0,
    activitySummary: user.activitySummary || '',
    accessPageIds: normalizeAccessPageIds(user.accessPageIds, role),
  };
}

function loadUsers() {
  const storedUsers = readJsonStorage(userStorageKey, [], {
    validate: Array.isArray,
  });

  if (storedUsers.length) {
    const normalizedUsers = storedUsers.map(normalizeUser);

    if (normalizedUsers.some((user) => user.username === currentAdminUsername)) {
      return normalizedUsers;
    }

    return [defaultSystemUsers[0], ...normalizedUsers];
  }

  return defaultSystemUsers;
}

function saveUsers(users) {
  try {
    writeJsonStorage(userStorageKey, users);
  } catch {
    // localStorage é opcional; a tela continua funcionando na sessão.
  }
}

function createBlankForm() {
  return {
    firstName: '',
    lastName: '',
    username: '',
    sector: sectorOptions[0],
    role: 'Usuário',
    status: 'Ativo',
    mustChangePassword: true,
    accessPageIds: [],
  };
}

function createFormFromUser(user) {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    sector: user.sector,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    accessPageIds: normalizeAccessPageIds(user.accessPageIds, user.role),
  };
}

export default function UserManagementPage() {
  const [users, setUsers] = useState(loadUsers);
  const [selectedUserId, setSelectedUserId] = useState(() => loadUsers()[0]?.id || null);
  const [form, setForm] = useState(() => createFormFromUser(loadUsers()[0] || defaultSystemUsers[0]));
  const [userSearch, setUserSearch] = useState('');
  const [accessSearch, setAccessSearch] = useState('');
  const [expandedAccessGroupIds, setExpandedAccessGroupIds] = useState(['gestao']);
  const [usernameTouched, setUsernameTouched] = useState(true);
  const [message, setMessage] = useAutoClearMessage();

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  const currentUser = users.find((user) => user.username === currentAdminUsername) || defaultSystemUsers[0];
  const currentUserIsAdmin = currentUser.role === 'Admin' && currentUser.status === 'Ativo';
  const selectedUser = users.find((user) => user.id === selectedUserId) || null;
  const isNewUser = !selectedUserId;
  const adminAccessLocked = form.role === 'Admin';

  const filteredUsers = useMemo(() => {
    const query = normalizeText(userSearch);
    const sortedUsers = [...users].sort((first, second) => first.username.localeCompare(second.username, 'pt-BR'));

    if (!query) return sortedUsers;

    return sortedUsers.filter((user) => (
      normalizeText(`${user.firstName} ${user.lastName} ${user.username} ${user.sector} ${user.role} ${user.status}`).includes(query)
    ));
  }, [users, userSearch]);

  const filteredAccessGroups = useMemo(() => {
    const query = normalizeText(accessSearch);
    return filterAccessNodes(accessGroups, query);
  }, [accessSearch]);

  const userSummary = useMemo(() => ({
    total: users.length,
    admins: users.filter((user) => user.role === 'Admin').length,
    active: users.filter((user) => user.status === 'Ativo').length,
    passwordChange: users.filter((user) => user.mustChangePassword).length,
  }), [users]);

  function updateNameField(field, value) {
    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [field]: value,
      };

      if (!usernameTouched) {
        nextForm.username = buildUsername(nextForm.firstName, nextForm.lastName);
      }

      return nextForm;
    });
    setMessage('');
  }

  function updateFormField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
    setMessage('');
  }

  function updateRole(role) {
    setForm((currentForm) => ({
      ...currentForm,
      role,
      accessPageIds: role === 'Admin' ? allAccessPageIds : currentForm.accessPageIds,
    }));
    setMessage('');
  }

  function selectUser(user) {
    setSelectedUserId(user.id);
    setForm(createFormFromUser(user));
    setUsernameTouched(true);
    setMessage('');
  }

  function startNewUser() {
    setSelectedUserId(null);
    setForm(createBlankForm());
    setUsernameTouched(false);
    setMessage('Preencha os dados para cadastrar um novo usuário');
  }

  function toggleAccess(pageId) {
    if (adminAccessLocked) return;

    setForm((currentForm) => {
      const hasAccess = currentForm.accessPageIds.includes(pageId);
      return {
        ...currentForm,
        accessPageIds: hasAccess
          ? currentForm.accessPageIds.filter((currentPageId) => currentPageId !== pageId)
          : [...currentForm.accessPageIds, pageId],
      };
    });
    setMessage('');
  }

  function toggleAccessGroup(pageIds) {
    if (adminAccessLocked) return;

    setForm((currentForm) => {
      const allSelected = pageIds.every((pageId) => currentForm.accessPageIds.includes(pageId));

      return {
        ...currentForm,
        accessPageIds: allSelected
          ? currentForm.accessPageIds.filter((pageId) => !pageIds.includes(pageId))
          : [...new Set([...currentForm.accessPageIds, ...pageIds])],
      };
    });
    setMessage('');
  }

  function toggleAccessGroupExpanded(groupId) {
    setExpandedAccessGroupIds((currentIds) => (
      currentIds.includes(groupId)
        ? currentIds.filter((currentId) => currentId !== groupId)
        : [...currentIds, groupId]
    ));
  }

  function accessSelectionStats(pageIds) {
    const selectedCount = pageIds.filter((pageId) => form.accessPageIds.includes(pageId)).length;

    return {
      selectedCount,
      allSelected: selectedCount === pageIds.length,
      partiallySelected: selectedCount > 0 && selectedCount < pageIds.length,
    };
  }

  function selectAllAccess() {
    if (adminAccessLocked) return;

    setForm((currentForm) => ({
      ...currentForm,
      accessPageIds: allAccessPageIds,
    }));
    setMessage('');
  }

  function clearAccess() {
    if (adminAccessLocked) return;

    setForm((currentForm) => ({
      ...currentForm,
      accessPageIds: [],
    }));
    setMessage('');
  }

  function handleUsernameChange(value) {
    setUsernameTouched(true);
    updateFormField('username', normalizeUsername(value));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!currentUserIsAdmin) {
      setMessage('Apenas usuários admin podem cadastrar ou alterar usuários');
      return;
    }

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const username = normalizeUsername(form.username || buildUsername(firstName, lastName));

    if (!firstName || !lastName || !username || !form.sector) {
      setMessage('Preencha nome, sobrenome, nome.usuario e setor');
      return;
    }

    const duplicatedUsername = users.some((user) => (
      user.id !== selectedUserId && user.username === username
    ));

    if (duplicatedUsername) {
      setMessage('Já existe um usuário com esse nome.usuario');
      return;
    }

    const accessPageIds = normalizeAccessPageIds(form.accessPageIds, form.role);

    if (selectedUser) {
      const nextUsers = users.map((user) => (
        user.id === selectedUser.id
          ? {
            ...user,
            firstName,
            lastName,
            username,
            sector: form.sector,
            role: form.role,
            status: form.status,
            mustChangePassword: Boolean(form.mustChangePassword),
            temporaryPassword: form.mustChangePassword ? '1234' : user.temporaryPassword,
            accessPageIds,
          }
          : user
      ));

      setUsers(nextUsers);
      recordAuditEvent({
        module: 'Sistema',
        action: auditActions.update,
        entityType: 'usuario',
        entityId: selectedUser.id,
        entityLabel: username,
        before: selectedUser,
        after: nextUsers.find((user) => user.id === selectedUser.id),
        summary: 'Usuario atualizado',
      });
      setForm((currentForm) => ({ ...currentForm, username, accessPageIds }));
      setMessage(`Usuário ${username} atualizado`);
      return;
    }

    const newUser = normalizeUser({
      id: `USR-${Date.now()}`,
      firstName,
      lastName,
      username,
      sector: form.sector,
      role: form.role,
      status: form.status,
      mustChangePassword: true,
      temporaryPassword: '1234',
      hasSystemActivity: false,
      activityCount: 0,
      activitySummary: '',
      accessPageIds,
    });

    setUsers((currentUsers) => [...currentUsers, newUser]);
    recordAuditEvent({
      module: 'Sistema',
      action: auditActions.create,
      entityType: 'usuario',
      entityId: newUser.id,
      entityLabel: newUser.username,
      before: null,
      after: newUser,
      summary: 'Usuario cadastrado',
    });
    setSelectedUserId(newUser.id);
    setForm(createFormFromUser(newUser));
    setUsernameTouched(true);
    setMessage(`Usuário ${username} cadastrado com senha padrão 1234`);
  }

  function handleDeleteOrDeactivate() {
    if (!selectedUser) {
      setMessage('Selecione um usuário cadastrado');
      return;
    }

    if (!currentUserIsAdmin) {
      setMessage('Apenas usuários admin podem excluir ou desativar usuários');
      return;
    }

    if (selectedUser.username === currentAdminUsername) {
      setMessage('O usuário admin logado não pode ser desativado nesta tela');
      return;
    }

    if (selectedUser.hasSystemActivity || selectedUser.activityCount > 0) {
      const nextUsers = users.map((user) => (
        user.id === selectedUser.id ? { ...user, status: 'Inativo' } : user
      ));
      setUsers(nextUsers);
      recordAuditEvent({
        module: 'Sistema',
        action: auditActions.deactivate,
        entityType: 'usuario',
        entityId: selectedUser.id,
        entityLabel: selectedUser.username,
        before: selectedUser,
        after: nextUsers.find((user) => user.id === selectedUser.id),
        summary: 'Usuario desativado',
      });
      setForm((currentForm) => ({ ...currentForm, status: 'Inativo' }));
      setMessage(`Usuário ${selectedUser.username} possui atividade e foi desativado`);
      return;
    }

    const nextUsers = users.filter((user) => user.id !== selectedUser.id);
    setUsers(nextUsers);
    recordAuditEvent({
      module: 'Sistema',
      action: auditActions.delete,
      entityType: 'usuario',
      entityId: selectedUser.id,
      entityLabel: selectedUser.username,
      before: selectedUser,
      after: null,
      summary: 'Usuario excluido',
    });
    const nextSelectedUser = nextUsers[0] || null;
    setSelectedUserId(nextSelectedUser?.id || null);
    setForm(nextSelectedUser ? createFormFromUser(nextSelectedUser) : createBlankForm());
    setUsernameTouched(Boolean(nextSelectedUser));
    setMessage(`Usuário ${selectedUser.username} excluído`);
  }

  function resetPassword() {
    if (!selectedUser) {
      setMessage('Selecione um usuário cadastrado para redefinir a senha');
      return;
    }

    if (!currentUserIsAdmin) {
      setMessage('Apenas usuários admin podem redefinir senhas');
      return;
    }

    const nextUsers = users.map((user) => (
      user.id === selectedUser.id
        ? { ...user, temporaryPassword: '1234', mustChangePassword: true }
        : user
    ));

    setUsers(nextUsers);
    recordAuditEvent({
      module: 'Sistema',
      action: auditActions.update,
      entityType: 'usuario',
      entityId: selectedUser.id,
      entityLabel: selectedUser.username,
      before: selectedUser,
      after: nextUsers.find((user) => user.id === selectedUser.id),
      summary: 'Senha temporaria redefinida',
    });
    setForm((currentForm) => ({ ...currentForm, mustChangePassword: true }));
    setMessage(`Senha de ${selectedUser.username} redefinida para 1234`);
  }

  function renderAccessNode(node, level = 0) {
    const hasChildren = Boolean(node.children?.length);
    const expanded = Boolean(accessSearch) || expandedAccessGroupIds.includes(node.id);
    const stats = accessSelectionStats(node.pageIds);
    const disabled = !currentUserIsAdmin || adminAccessLocked;

    if (!hasChildren) {
      return (
        <label className="user-access-leaf" style={{ '--access-level': level }} key={node.id}>
          <input
            type="checkbox"
            checked={form.accessPageIds.includes(node.pageId)}
            disabled={disabled}
            aria-label={`Liberar acesso a ${node.label}`}
            onChange={() => toggleAccess(node.pageId)}
          />
          <div>
            <strong>{node.label}</strong>
            <span>{node.menuPath}</span>
          </div>
        </label>
      );
    }

    return (
      <div className="user-access-node" style={{ '--access-level': level }} key={node.id}>
        <div className="user-access-node-header">
          <button
            type="button"
            className="user-access-expand-button"
            aria-label={`${expanded ? 'Recolher' : 'Expandir'} ${node.label}`}
            aria-expanded={expanded}
            onClick={() => toggleAccessGroupExpanded(node.id)}
          >
            {expanded ? (
              <ChevronDown size={16} strokeWidth={2.4} />
            ) : (
              <ChevronRight size={16} strokeWidth={2.4} />
            )}
          </button>

          <label className={`user-access-node-check${stats.partiallySelected ? ' user-access-node-check--partial' : ''}`}>
            <input
              type="checkbox"
              checked={stats.allSelected}
              disabled={disabled}
              aria-checked={stats.partiallySelected ? 'mixed' : stats.allSelected}
              onChange={() => toggleAccessGroup(node.pageIds)}
            />
            <div>
              <strong>{node.label}</strong>
              <span>{stats.selectedCount} de {node.pageIds.length} acesso(s)</span>
            </div>
          </label>
        </div>

        {expanded && (
          <div className="user-access-node-children">
            {node.children.map((child) => renderAccessNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="user-management-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-kicker">Cadastre usuários, defina perfil admin e controle o acesso aos menus do sistema</p>
        </div>
        <button type="button" className="primary-button" onClick={startNewUser}>
          <UserPlus size={15} strokeWidth={2.2} />
          Novo usuário
        </button>
      </header>

      <div className="user-management-summary-grid" aria-label="Resumo de usuários">
        <div>
          <span>Total</span>
          <strong>{userSummary.total}</strong>
        </div>
        <div>
          <span>Admins</span>
          <strong>{userSummary.admins}</strong>
        </div>
        <div>
          <span>Ativos</span>
          <strong>{userSummary.active}</strong>
        </div>
        <div>
          <span>Troca de senha</span>
          <strong>{userSummary.passwordChange}</strong>
        </div>
      </div>

      <div className="user-management-layout">
        <section className="registered-launches-panel user-management-list-panel" aria-labelledby="user-list-title">
          <div className="registered-launches-header">
            <h2 id="user-list-title">Usuários cadastrados</h2>
            <div><span>{filteredUsers.length} usuário(s)</span></div>
          </div>

          <div className="lookup-modal-toolbar shortcut-searchbar">
            <div className="lookup-field">
              <input
                type="search"
                className="lookup-search"
                placeholder="Pesquisar usuário, setor ou perfil"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
              />
              <span className="shortcut-search-icon" aria-hidden="true">
                <Search size={16} strokeWidth={2.2} />
              </span>
            </div>
          </div>

          <div className="registered-launches-table-wrap user-management-table-wrap">
            <table className="registered-launches-table user-management-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Setor</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Vinculos</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={selectedUserId === user.id ? 'user-management-row--selected' : ''}
                    onClick={() => selectUser(user)}
                  >
                    <td>
                      <button type="button" className="user-link-button" onClick={() => selectUser(user)}>
                        <strong>{user.firstName} {user.lastName}</strong>
                        <span>{user.username}</span>
                      </button>
                    </td>
                    <td>{user.sector}</td>
                    <td><span className="user-role-pill">{user.role}</span></td>
                    <td><span className={`user-status-pill ${user.status === 'Inativo' ? 'user-status-pill--inactive' : ''}`}>{user.status}</span></td>
                    <td>{user.activityCount ? `${user.activityCount} atividade(s)` : 'Sem vinculo'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredUsers.length && <div className="empty-list">Nenhum usuário encontrado</div>}
          </div>
        </section>

        <form className="selection-panel user-management-form-panel" onSubmit={handleSubmit}>
          <div className="selection-panel-header">
            <h2>{isNewUser ? 'Cadastrar usuário' : 'Dados do usuário'}</h2>
            <strong>{form.role}</strong>
          </div>

          <div className="user-management-form-body">
            <div className="form-grid">
              <label className="field">
                <span>Nome</span>
                <input
                  type="text"
                  value={form.firstName}
                  disabled={!currentUserIsAdmin}
                  onChange={(event) => updateNameField('firstName', event.target.value)}
                />
              </label>

              <label className="field">
                <span>Sobrenome</span>
                <input
                  type="text"
                  value={form.lastName}
                  disabled={!currentUserIsAdmin}
                  onChange={(event) => updateNameField('lastName', event.target.value)}
                />
              </label>

              <label className="field field--span-2">
                <span>nome.usuario</span>
                <input
                  type="text"
                  value={form.username}
                  disabled={!currentUserIsAdmin}
                  onChange={(event) => handleUsernameChange(event.target.value)}
                />
              </label>

              <label className="field">
                <span>Setor</span>
                <select
                  value={form.sector}
                  disabled={!currentUserIsAdmin}
                  onChange={(event) => updateFormField('sector', event.target.value)}
                >
                  {sectorOptions.map((sector) => (
                    <option value={sector} key={sector}>{sector}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Perfil</span>
                <select
                  value={form.role}
                  disabled={!currentUserIsAdmin}
                  onChange={(event) => updateRole(event.target.value)}
                >
                  {roleOptions.map((role) => (
                    <option value={role} key={role}>{role}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  value={form.status}
                  disabled={!currentUserIsAdmin}
                  onChange={(event) => updateFormField('status', event.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option value={status} key={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Senha padrão</span>
                <input type="text" value="1234" readOnly />
              </label>

              <label className="field inline-check-field field--span-2">
                <input
                  type="checkbox"
                  checked={Boolean(form.mustChangePassword)}
                  disabled={!currentUserIsAdmin || isNewUser}
                  onChange={(event) => updateFormField('mustChangePassword', event.target.checked)}
                />
                <span>Alterar senha no primeiro login</span>
              </label>
            </div>

            {selectedUser?.activitySummary && (
              <div className="user-activity-note">
                <strong>Vinculos no sistema</strong>
                <span>{selectedUser.activitySummary}</span>
              </div>
            )}

            <div className="user-management-actions">
              <button type="submit" className="primary-button" disabled={!currentUserIsAdmin}>
                <Save size={15} strokeWidth={2.2} />
                Salvar usuário
              </button>
              <button type="button" className="secondary-button" disabled={!selectedUser || !currentUserIsAdmin} onClick={resetPassword}>
                <RotateCcw size={15} strokeWidth={2.2} />
                Redefinir senha
              </button>
              <button
                type="button"
                className={selectedUser?.hasSystemActivity || selectedUser?.activityCount ? 'secondary-button' : 'danger-button'}
                disabled={!selectedUser || !currentUserIsAdmin}
                onClick={handleDeleteOrDeactivate}
              >
                {selectedUser?.hasSystemActivity || selectedUser?.activityCount ? (
                  <Power size={15} strokeWidth={2.2} />
                ) : (
                  <Trash2 size={15} strokeWidth={2.2} />
                )}
                {selectedUser?.hasSystemActivity || selectedUser?.activityCount ? 'Desativar' : 'Excluir'}
              </button>
            </div>

            <div className="shortcut-manager-status" aria-live="polite">{message}</div>
          </div>
        </form>
      </div>

      <section className="registered-launches-panel user-access-panel" aria-labelledby="user-access-title">
        <div className="registered-launches-header">
          <h2 id="user-access-title">Acessos de menu e submenu</h2>
          <div>
            <ShieldCheck size={15} strokeWidth={2.2} />
            <span>{form.accessPageIds.length} tela(s) liberada(s)</span>
          </div>
        </div>

        <div className="user-access-toolbar">
          <div className="lookup-field">
            <input
              type="search"
              className="lookup-search"
              placeholder="Pesquisar menu, submenu ou tela"
              value={accessSearch}
              onChange={(event) => setAccessSearch(event.target.value)}
            />
            <span className="shortcut-search-icon" aria-hidden="true">
              <Search size={16} strokeWidth={2.2} />
            </span>
          </div>
          <button type="button" className="secondary-button" disabled={!currentUserIsAdmin || adminAccessLocked} onClick={selectAllAccess}>
            Selecionar tudo
          </button>
          <button type="button" className="secondary-button" disabled={!currentUserIsAdmin || adminAccessLocked} onClick={clearAccess}>
            Limpar
          </button>
        </div>

        {adminAccessLocked && (
          <div className="user-access-admin-lock">Perfil Admin recebe acesso total aos menus do sistema.</div>
        )}

        <div className="user-access-groups">
          {filteredAccessGroups.map((group) => renderAccessNode(group))}
          {!filteredAccessGroups.length && <div className="empty-list">Nenhum acesso encontrado</div>}
        </div>
      </section>
    </section>
  );
}
