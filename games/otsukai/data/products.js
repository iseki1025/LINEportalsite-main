const asset = (id) => new URL(`../assets/products/${id}.svg`, import.meta.url).href;

export const PRODUCTS = Object.freeze([
  ['apple', 'りんご', 'produce'], ['banana', 'バナナ', 'produce'], ['mandarin', 'みかん', 'produce'],
  ['tomato', 'トマト', 'produce'], ['carrot', 'にんじん', 'produce'], ['cucumber', 'きゅうり', 'produce'],
  ['milk', '牛乳', 'chilled'], ['yogurt', 'ヨーグルト', 'chilled'], ['cheese', 'チーズ', 'chilled'],
  ['egg', 'たまご', 'chilled'], ['tofu', '豆腐', 'chilled'], ['natto', '納豆', 'chilled'],
  ['sliced_bread', '食パン', 'staple'], ['roll_bread', 'ロールパン', 'staple'], ['rice_ball', 'おにぎり', 'staple'],
  ['rice_bag', 'お米', 'staple'], ['udon', 'うどん', 'staple'], ['cereal', 'シリアル', 'staple'],
  ['tissues', 'ティッシュ', 'household'], ['toilet_paper', 'トイレットペーパー', 'household'], ['soap', '石けん', 'household'],
  ['toothbrush', '歯ブラシ', 'household'], ['towel', 'タオル', 'household'], ['detergent', '洗剤', 'household'],
  ['tea', 'お茶', 'pantry'], ['water', '水', 'pantry'], ['coffee', 'コーヒー', 'pantry'],
  ['miso', 'みそ', 'pantry'], ['jam', 'ジャム', 'pantry'], ['biscuits', 'ビスケット', 'pantry'],
].map(([id, label, category]) => Object.freeze({
  id,
  label,
  category,
  asset: asset(id),
  alt: `${label}のイラスト`,
})));

export const PRODUCT_BY_ID = Object.freeze(Object.fromEntries(PRODUCTS.map((product) => [product.id, product])));
