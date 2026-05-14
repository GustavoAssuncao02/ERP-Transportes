import { Building2, CalendarDays, UserRound } from 'lucide-react';
import { companyDetails } from '../data/siteData.js';

const detailIcons = {
  monitor: Building2,
  user: UserRound,
  calendar: CalendarDays,
};

export default function UserBar() {
  return (
    <header className="user-bar" aria-label="Dados do usuário">
      <div className="user-bar-brand" aria-label="Vexo">
        <span>V</span>exo
      </div>

      <div className="user-bar-details">
        {companyDetails.map((detail) => {
          const Icon = detailIcons[detail.icon];

          return (
            <div className="user-bar-info" key={detail.id}>
              <Icon size={14} strokeWidth={2.1} aria-hidden="true" />
              <span>{detail.label}</span>
            </div>
          );
        })}
      </div>
    </header>
  );
}
