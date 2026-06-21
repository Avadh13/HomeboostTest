type AdminFormInputProps = {
  label: string;
  name: string;
  value: string | number;
  placeholder?: string;
  type?: string;
  required?: boolean;
  onChange: (value: string) => void;
};

function AdminFormInput({
  label,
  name,
  value,
  placeholder,
  type = "text",
  required = false,
  onChange,
}: AdminFormInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

export default AdminFormInput;
