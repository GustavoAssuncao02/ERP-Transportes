import {
  defaultAddressFields,
  brazilianStateOptions,
  fetchAddressByZipCode,
  formatZipCode,
  zipCodeDigits,
} from '../utils/address.js';

export default function AddressFields({
  values,
  onChange,
  onChangeMany,
  onStatus,
  fields = defaultAddressFields,
  required = false,
  context = '',
  showState = false,
}) {
  const suffix = context ? ` ${context}` : '';

  function updateField(field, value) {
    onChange?.(field, value);
  }

  function updateFields(updates) {
    if (onChangeMany) {
      onChangeMany(updates);
      return;
    }

    Object.entries(updates).forEach(([field, value]) => updateField(field, value));
  }

  async function handleZipCodeBlur() {
    const digits = zipCodeDigits(values[fields.zipCode]);

    if (!digits) return;

    if (digits.length !== 8) {
      onStatus?.('Informe um CEP com 8 dígitos');
      return;
    }

    try {
      const address = await fetchAddressByZipCode(digits);

      if (!address) {
        onStatus?.('CEP não encontrado');
        return;
      }

      updateFields({
        [fields.zipCode]: address.zipCode,
        [fields.street]: address.street || values[fields.street] || '',
        [fields.district]: address.district || values[fields.district] || '',
        [fields.state]: address.state || values[fields.state] || '',
      });
      onStatus?.(
        address.city && address.state
          ? `CEP localizado: ${address.city}/${address.state}`
          : 'Endereço preenchido pelo CEP',
      );
    } catch {
      onStatus?.('Não foi possível consultar o CEP agora');
    }
  }

  return (
    <>
      <label className="field">
        <span>{`CEP${suffix}`}</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          value={values[fields.zipCode] || ''}
          onChange={(event) => updateField(fields.zipCode, formatZipCode(event.target.value))}
          onBlur={handleZipCodeBlur}
          required={required}
        />
      </label>

      <label className="field">
        <span>{`Rua${suffix}`}</span>
        <input
          type="text"
          value={values[fields.street] || ''}
          onChange={(event) => updateField(fields.street, event.target.value)}
          required={required}
        />
      </label>

      <label className="field">
        <span>{`Número${suffix}`}</span>
        <input
          type="text"
          value={values[fields.number] || ''}
          onChange={(event) => updateField(fields.number, event.target.value)}
          required={required}
        />
      </label>

      <label className="field">
        <span>{`Bairro${suffix}`}</span>
        <input
          type="text"
          value={values[fields.district] || ''}
          onChange={(event) => updateField(fields.district, event.target.value)}
          required={required}
        />
      </label>

      {showState && (
        <label className="field">
          <span>{`UF${suffix}`}</span>
          <select
            value={values[fields.state] || ''}
            onChange={(event) => updateField(fields.state, event.target.value)}
            required={required}
          >
            <option value="">Selecione</option>
            {brazilianStateOptions.map((stateOption) => (
              <option value={stateOption} key={stateOption}>{stateOption}</option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
