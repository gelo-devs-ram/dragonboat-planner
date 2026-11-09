import CrudPage from './CrudPage.jsx';
import { fmtDate, fmtTime } from '../api.js';

const fields = [
  { key: 'name', label: 'Race name', type: 'text' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'time', label: 'Time', type: 'time' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'organizers', label: 'Organizers', type: 'text' },
];

const columns = [
  { label: 'Race', render: (r) => <strong>{r.name}</strong> },
  { label: 'Date', render: (r) => fmtDate(r.date) },
  { label: 'Time', render: (r) => fmtTime(r.time) },
  { label: 'Location', render: (r) => r.location },
  { label: 'Organizers', render: (r) => r.organizers },
];

export default function Races() {
  return (
    <CrudPage
      title="Races"
      intro="Post upcoming races, then build the line-up for each one."
      endpoint="/api/races"
      noun="race"
      fields={fields}
      columns={columns}
    />
  );
}
