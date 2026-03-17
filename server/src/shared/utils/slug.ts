// Простой slug: латиница/цифры/дефис. Для кириллицы — примитивная транслитерация.
const table: Record<string, string> = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z',
  и:'i', й:'i', к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r',
  с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'c', ч:'ch', ш:'sh', щ:'sch',
  ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
};
export function slugify(input: string): string {
  const lower = input.trim().toLowerCase();
  let out = '';
  for (const ch of lower) {
    if (/[a-z0-9]/.test(ch)) out += ch;
    else if (ch === ' ' || ch === '_' || ch === '-') out += '-';
    else if (table[ch]) out += table[ch];
    else if (/[а-яё]/.test(ch)) out += table[ch] ?? '';
    // остальные символы игнорируем
  }
  out = out.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return out.slice(0, 64) || 'item';
}
  