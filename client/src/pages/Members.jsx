import CrudPage from './CrudPage.jsx';

const fields = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'gender', label: 'Gender', type: 'select', placeholder: 'Choose gender', options: ['Male', 'Female'] },
  { key: 'age', label: 'Age', type: 'number', min: 10, max: 80 },
  { key: 'weight_kg', label: 'Weight (kg, optional)', type: 'number', min: 20, max: 200, step: '0.1', required: false },
  {
    key: 'rating',
    label: 'Performance rating',
    type: 'select',
    default: 3,
    options: [
      { value: 1, label: '1 - Needs work' },
      { value: 2, label: '2 - Developing' },
      { value: 3, label: '3 - Solid' },
      { value: 4, label: '4 - Strong' },
      { value: 5, label: '5 - Top paddler' },
    ],
  },
];

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

export const Chance = ({ value }) => (
  <div className="chance" title={`${value}% chance of selection`}>
    <div className="chance-bar">
      <span style={{ width: `${value}%` }} />
    </div>
    <b>{value}%</b>
  </div>
);

const columns = [
  { label: 'Name', render: (m) => <strong>{m.name}</strong> },
  { label: 'Gender', render: (m) => m.gender },
  { label: 'Age', render: (m) => m.age },
  { label: 'Weight', render: (m) => (m.weight_kg ? `${m.weight_kg} kg` : '-') },
  { label: 'Rating', render: (m) => <span className="stars" aria-label={`${m.rating} out of 5`}>{stars(m.rating)}</span> },
  { label: 'Attendance', render: (m) => (m.sessions_total ? `${m.present_count}/${m.sessions_total} (${m.attendance_rate}%)` : 'No sessions yet') },
  { label: 'Selection chance', render: (m) => <Chance value={m.selection_probability} /> },
];

export default function Members() {
  return (
    <CrudPage
      title="Members"
      intro="Selection chance combines the coach rating (70%) with training attendance (30%)."
      endpoint="/api/members"
      noun="member"
      fields={fields}
      columns={columns}
    />
  );
}
