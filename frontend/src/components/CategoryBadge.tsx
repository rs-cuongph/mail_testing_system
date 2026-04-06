interface Props {
  name: string;
  color: string;
}

export function CategoryBadge({ name, color }: Props) {
  return (
    <span style={{ 
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', 
      borderRadius: '12px', fontSize: '11px', fontWeight: 600, 
      backgroundColor: `${color}20`, color: color, border: `1px solid ${color}40`,
      whiteSpace: 'nowrap'
    }}>
      {name}
    </span>
  );
}
