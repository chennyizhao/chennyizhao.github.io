export function localized(value, language = 'zh') {
  if (value == null) return '';
  return typeof value === 'object' ? (value[language] || '') : String(value);
}
export function chronological(items, direction = 'desc') {
  return items.map((item, i) => ({item, i})).sort((a,b) => {
    if (!a.item.date && !b.item.date) return a.i-b.i;
    if (!a.item.date) return 1;
    if (!b.item.date) return -1;
    return (direction === 'asc' ? 1 : -1) * String(a.item.date).localeCompare(String(b.item.date)) || a.i-b.i;
  }).map(x=>x.item);
}
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function randomHomepage(data, random = Math.random) {
  const pick = items => items.length ? items[Math.min(items.length-1, Math.floor(random()*items.length))] : null;
  const photographs=data.photography.flatMap(series=>series.images.map(image=>({image,series})));
  const hero=pick(photographs);
  const photo=pick(photographs.filter(x=>x.image.src!==hero?.image.src));
  const projects=['bookstore','apartments'].map(id=>data.architecture.find(project=>project.id===id));
  return {
    hero:hero?{src:hero.image.src,title:hero.image.title}:null,
    featured:[...projects.map(project=>{const image=project&&pick(project.images);return image?{src:image.thumb||image.src,title:project.title,href:'#/architecture/'+project.id}:null;}),photo?{src:photo.image.thumb||photo.image.src,title:photo.series.title,href:'#/photography/'+photo.series.id}:null]
  };
}
