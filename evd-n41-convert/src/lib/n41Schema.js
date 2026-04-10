// N41 Import column definitions for all 5 modules
// Each column: { desc_ko, desc_en, default_src, default_tf }
// default_src: EVD column name | '__fixed__' | '__row_index__' | '__computed__xxx' | ''

export const MODULES = [
  { key: 'sales_order',    label_ko: 'Sales Order',    label_en: 'Sales Order',    icon: '🛒' },
  { key: 'purchase_order', label_ko: 'Purchase Order', label_en: 'Purchase Order', icon: '📦' },
  { key: 'style',          label_ko: 'Style',          label_en: 'Style',          icon: '👗' },
  { key: 'customer',       label_ko: 'Customer',       label_en: 'Customer',       icon: '🏪' },
  { key: 'inventory',      label_ko: 'Inventory',      label_en: 'Inventory',      icon: '📊' },
]

// ─── Sales Order (57 cols) ────────────────────────────────────────────────────
export const SALES_ORDER_SCHEMA = {
  index:         { ko: '행 인덱스',       en: 'Row index',         src: '__row_index__',        tf: '' },
  orderNo:       { ko: '주문번호',        en: 'Order number',      src: '',                     tf: '' },
  orderDate:     { ko: '주문일',          en: 'Order date',        src: '',                     tf: 'date:MM/DD/YYYY' },
  startDate:     { ko: '선적 시작일',     en: 'Ship start date',   src: '',                     tf: 'date:MM/DD/YYYY' },
  customer:      { ko: '고객코드',        en: 'Customer code',     src: '',                     tf: '' },
  type:          { ko: '주문타입',        en: 'Order type',        src: '',                     tf: '' },
  shipTo:        { ko: '배송지',          en: 'Ship-to',           src: '',                     tf: '' },
  billTo:        { ko: '청구지',          en: 'Bill-to',           src: '',                     tf: '' },
  division:      { ko: '사업부',          en: 'Division',          src: '__fixed__',            tf: '' },
  po:            { ko: '고객 PO번호',     en: 'Customer PO',       src: '',                     tf: '' },
  releaseNo:     { ko: '릴리즈번호',      en: 'Release number',    src: '__fixed__',            tf: '' },
  shipVia:       { ko: '배송방법',        en: 'Ship via',          src: '__fixed__',            tf: '' },
  term:          { ko: '결제조건',        en: 'Payment terms',     src: '',                     tf: '' },
  memo:          { ko: '주문 메모',       en: 'Order memo',        src: '',                     tf: '' },
  houseMemo:     { ko: '사내 메모',       en: 'House memo',        src: '__fixed__',            tf: '' },
  bulkOrder:     { ko: '대량주문',        en: 'Bulk order',        src: '__fixed__',            tf: '' },
  box:           { ko: '박스',            en: 'Box',               src: '__fixed__',            tf: '' },
  currency:      { ko: '통화',            en: 'Currency',          src: '',                     tf: '' },
  orderDecision: { ko: '주문결정',        en: 'Order decision',    src: '__fixed__',            tf: '' },
  discountRate:  { ko: '할인율',          en: 'Discount rate',     src: '',                     tf: '' },
  memoCode:      { ko: '메모코드',        en: 'Memo code',         src: '__fixed__',            tf: '' },
  voids:         { ko: '취소',            en: 'Voids',             src: '__fixed__',            tf: '' },
  updateUser:    { ko: '수정자',          en: 'Update user',       src: '__fixed__',            tf: '' },
  updateTime:    { ko: '수정시간',        en: 'Update time',       src: '__fixed__',            tf: '' },
  routingGuide:  { ko: '라우팅가이드',    en: 'Routing guide',     src: '__fixed__',            tf: '' },
  priceLevel:    { ko: '가격레벨',        en: 'Price level',       src: '__fixed__',            tf: '' },
  shipToStore:   { ko: '배송스토어',      en: 'Ship-to store',     src: '__fixed__',            tf: '' },
  dc:            { ko: 'DC코드',          en: 'DC code',           src: '__fixed__',            tf: '' },
  paymentCode:   { ko: '결제코드',        en: 'Payment code',      src: '__fixed__',            tf: '' },
  freight:       { ko: '운임',            en: 'Freight',           src: '__fixed__',            tf: '' },
  misc:          { ko: '기타',            en: 'Misc',              src: '__fixed__',            tf: '' },
  taxable1:      { ko: '과세1',           en: 'Taxable 1',         src: '__fixed__',            tf: '' },
  taxable2:      { ko: '과세2',           en: 'Taxable 2',         src: '__fixed__',            tf: '' },
  line:          { ko: '라인번호',        en: 'Line number',       src: '__row_index__',        tf: '' },
  style:         { ko: '스타일번호',      en: 'Style number',      src: '',                     tf: '' },
  color:         { ko: '컬러코드',        en: 'Color code',        src: '',                     tf: '' },
  warehouse:     { ko: '창고',            en: 'Warehouse',         src: '__fixed__',            tf: '' },
  cancelDate:    { ko: '취소일',          en: 'Cancel date',       src: '',                     tf: 'date:MM/DD/YYYY' },
  status:        { ko: '상태',            en: 'Status',            src: '__fixed__',            tf: 'N' },
  sizeCategory:  { ko: '사이즈 카테고리', en: 'Size category',     src: '__fixed__',            tf: '' },
  size:          { ko: '사이즈',          en: 'Size',              src: '',                     tf: '' },
  quantity:      { ko: '수량',            en: 'Quantity',          src: '',                     tf: '' },
  price:         { ko: '단가',            en: 'Unit price',        src: '',                     tf: '' },
  memoDet:       { ko: '라인 메모',       en: 'Line memo',         src: '',                     tf: '' },
  userName:      { ko: '작성자',          en: 'User name',         src: '__fixed__',            tf: '' },
  userTime:      { ko: '작성시간',        en: 'User time',         src: '__fixed__',            tf: '' },
  cancelReason:  { ko: '취소사유',        en: 'Cancel reason',     src: '__fixed__',            tf: '' },
  season:        { ko: '시즌',            en: 'Season',            src: '',                     tf: '' },
  promotion:     { ko: '프로모션',        en: 'Promotion',         src: '__fixed__',            tf: '' },
  salesRep1:     { ko: '영업담당1',       en: 'Sales rep 1',       src: '',                     tf: '' },
  comRate1:      { ko: '커미션율1',       en: 'Commission 1',      src: '__fixed__',            tf: '' },
  salesRep2:     { ko: '영업담당2',       en: 'Sales rep 2',       src: '',                     tf: '' },
  comRate2:      { ko: '커미션율2',       en: 'Commission 2',      src: '__fixed__',            tf: '' },
  tradeShow:     { ko: '전시회',          en: 'Trade show',        src: '__fixed__',            tf: '' },
  bundle:        { ko: '번들',            en: 'Bundle',            src: '__fixed__',            tf: '' },
  numOfBundle:   { ko: '번들수량',        en: '# of bundles',      src: '__fixed__',            tf: '' },
  checkSkip:     { ko: '체크스킵',        en: 'Check skip',        src: '__fixed__',            tf: '' },
}

// ─── Purchase Order (37 cols) ─────────────────────────────────────────────────
export const PURCHASE_ORDER_SCHEMA = {
  poNo:        { ko: 'PO번호',      en: 'PO number',      src: '',          tf: '' },
  cutPo:       { ko: 'Cut PO',      en: 'Cut PO',         src: '__fixed__', tf: '' },
  processType: { ko: '프로세스타입', en: 'Process type',   src: '__fixed__', tf: '' },
  orderDate:   { ko: '주문일',      en: 'Order date',     src: '',          tf: 'date:MM/DD/YYYY' },
  startDate:   { ko: '입고 시작일', en: 'Start date',     src: '',          tf: 'date:MM/DD/YYYY' },
  cancelDate:  { ko: '취소일',      en: 'Cancel date',    src: '',          tf: 'date:MM/DD/YYYY' },
  etaDate:     { ko: 'ETA',         en: 'ETA date',       src: '',          tf: 'date:MM/DD/YYYY' },
  shipDate:    { ko: '선적일',      en: 'Ship date',      src: '',          tf: 'date:MM/DD/YYYY' },
  vendor:      { ko: '벤더코드',    en: 'Vendor code',    src: '',          tf: '' },
  division:    { ko: '사업부',      en: 'Division',       src: '__fixed__', tf: '' },
  warehouse:   { ko: '창고',        en: 'Warehouse',      src: '__fixed__', tf: '' },
  status:      { ko: '상태',        en: 'Status',         src: '__fixed__', tf: '' },
  shipVia:     { ko: '배송방법',    en: 'Ship via',       src: '__fixed__', tf: '' },
  user1:       { ko: '사용자1',     en: 'User field 1',   src: '__fixed__', tf: '' },
  user2:       { ko: '사용자2',     en: 'User field 2',   src: '__fixed__', tf: '' },
  user3:       { ko: '사용자3',     en: 'User field 3',   src: '__fixed__', tf: '' },
  user4:       { ko: '사용자4',     en: 'User field 4',   src: '__fixed__', tf: '' },
  line:        { ko: '라인번호',    en: 'Line number',    src: '__row_index__', tf: '' },
  style:       { ko: '스타일번호',  en: 'Style number',   src: '',          tf: '' },
  color:       { ko: '컬러코드',    en: 'Color code',     src: '',          tf: '' },
  unit1:       { ko: '수량1',       en: 'Unit 1',         src: '',          tf: '' },
  unit2:       { ko: '수량2',       en: 'Unit 2',         src: '',          tf: '' },
  unit3:       { ko: '수량3',       en: 'Unit 3',         src: '',          tf: '' },
  unit4:       { ko: '수량4',       en: 'Unit 4',         src: '',          tf: '' },
  unit5:       { ko: '수량5',       en: 'Unit 5',         src: '',          tf: '' },
  unit6:       { ko: '수량6',       en: 'Unit 6',         src: '',          tf: '' },
  unit7:       { ko: '수량7',       en: 'Unit 7',         src: '',          tf: '' },
  unit8:       { ko: '수량8',       en: 'Unit 8',         src: '',          tf: '' },
  unit9:       { ko: '수량9',       en: 'Unit 9',         src: '',          tf: '' },
  unit10:      { ko: '수량10',      en: 'Unit 10',        src: '',          tf: '' },
  unit11:      { ko: '수량11',      en: 'Unit 11',        src: '',          tf: '' },
  unit12:      { ko: '수량12',      en: 'Unit 12',        src: '',          tf: '' },
  unit13:      { ko: '수량13',      en: 'Unit 13',        src: '',          tf: '' },
  unit14:      { ko: '수량14',      en: 'Unit 14',        src: '',          tf: '' },
  unit15:      { ko: '수량15',      en: 'Unit 15',        src: '',          tf: '' },
  unitSum:     { ko: '총수량',      en: 'Unit sum',       src: '',          tf: '' },
  price:       { ko: '단가',        en: 'Price',          src: '',          tf: '' },
}

// ─── Style (240 cols — grouped) ───────────────────────────────────────────────
// Only the most commonly used fields have suggested src mappings
export const STYLE_SCHEMA = {
  style:             { ko: '스타일번호',    en: 'Style number',   src: '', tf: '' },
  color:             { ko: '컬러코드',      en: 'Color code',     src: '', tf: '' },
  status:            { ko: '상태',          en: 'Status',         src: '__fixed__', tf: '' },
  descript:          { ko: '스타일명',      en: 'Description',    src: '', tf: '' },
  division:          { ko: '사업부',        en: 'Division',       src: '__fixed__', tf: '' },
  subdivision:       { ko: '서브사업부',    en: 'Subdivision',    src: '__fixed__', tf: '' },
  fabricType:        { ko: '원단타입',      en: 'Fabric type',    src: '', tf: '' },
  processType:       { ko: '프로세스타입',  en: 'Process type',   src: '__fixed__', tf: '' },
  category:          { ko: '카테고리',      en: 'Category',       src: '', tf: '' },
  subCategory:       { ko: '서브카테고리',  en: 'Sub-category',   src: '', tf: '' },
  designer:          { ko: '디자이너',      en: 'Designer',       src: '', tf: '' },
  impCat:            { ko: '수입카테고리',  en: 'Import category',src: '__fixed__', tf: '' },
  season:            { ko: '시즌',          en: 'Season',         src: '', tf: '' },
  grp:               { ko: '그룹',          en: 'Group',          src: '__fixed__', tf: '' },
  coo:               { ko: '원산지',        en: 'Country of origin', src: '', tf: '' },
  hsTariffNo:        { ko: 'HS관세번호',    en: 'HS tariff no',   src: '', tf: '' },
  binLocation:       { ko: '빈 위치',       en: 'Bin location',   src: '__fixed__', tf: '' },
  binLocation2:      { ko: '빈 위치2',      en: 'Bin location 2', src: '__fixed__', tf: '' },
  availableDate:     { ko: '판매가능일',    en: 'Available date', src: '', tf: 'date:MM/DD/YYYY' },
  startSellDate:     { ko: '판매시작일',    en: 'Start sell date',src: '', tf: 'date:MM/DD/YYYY' },
  sizeCat:           { ko: '사이즈카테고리',en: 'Size category',  src: '__fixed__', tf: '' },
  bundle:            { ko: '번들',          en: 'Bundle',         src: '__fixed__', tf: '' },
  fabContent:        { ko: '원단성분',      en: 'Fabric content', src: '', tf: '' },
  price1:            { ko: '가격1',         en: 'Price 1',        src: '', tf: '' },
  price2:            { ko: '가격2',         en: 'Price 2',        src: '', tf: '' },
  price3:            { ko: '가격3',         en: 'Price 3',        src: '', tf: '' },
  price4:            { ko: '가격4',         en: 'Price 4',        src: '__fixed__', tf: '' },
  price5:            { ko: '가격5',         en: 'Price 5',        src: '__fixed__', tf: '' },
  cost:              { ko: '원가',          en: 'Cost',           src: '', tf: '' },
  cost1:             { ko: '원가1',         en: 'Cost 1',         src: '', tf: '' },
  cost2:             { ko: '원가2',         en: 'Cost 2',         src: '__fixed__', tf: '' },
  cost3:             { ko: '원가3',         en: 'Cost 3',         src: '__fixed__', tf: '' },
  avgCost:           { ko: '평균원가',      en: 'Avg cost',       src: '__fixed__', tf: '' },
  stdCost:           { ko: '표준원가',      en: 'Std cost',       src: '__fixed__', tf: '' },
  memo:              { ko: '메모',          en: 'Memo',           src: '', tf: '' },
  poMemo:            { ko: 'PO메모',        en: 'PO memo',        src: '', tf: '' },
  ciMemo:            { ko: 'CI메모',        en: 'CI memo',        src: '__fixed__', tf: '' },
  lot:               { ko: '로트',          en: 'Lot',            src: '__fixed__', tf: '' },
  leadTime:          { ko: '리드타임',      en: 'Lead time',      src: '', tf: '' },
  vendorPartNo:      { ko: '벤더파트번호',  en: 'Vendor part no', src: '', tf: '' },
  width:             { ko: '너비',          en: 'Width',          src: '', tf: '' },
  vendorColor1:      { ko: '벤더컬러1',     en: 'Vendor color 1', src: '', tf: '' },
  vendorColor2:      { ko: '벤더컬러2',     en: 'Vendor color 2', src: '__fixed__', tf: '' },
  vendorColor3:      { ko: '벤더컬러3',     en: 'Vendor color 3', src: '__fixed__', tf: '' },
  active:            { ko: '활성',          en: 'Active',         src: '__fixed__', tf: '' },
  vendor1:           { ko: '벤더1',         en: 'Vendor 1',       src: '', tf: '' },
  vendorPart1:       { ko: '벤더파트1',     en: 'Vendor part 1',  src: '', tf: '' },
  vendor2:           { ko: '벤더2',         en: 'Vendor 2',       src: '__fixed__', tf: '' },
  vendorPart2:       { ko: '벤더파트2',     en: 'Vendor part 2',  src: '__fixed__', tf: '' },
  uom:               { ko: '단위',          en: 'Unit of measure',src: '__fixed__', tf: '' },
  weight:            { ko: '무게',          en: 'Weight',         src: '', tf: '' },
  sgtRetailPrice:    { ko: '권장소비자가',  en: 'Suggested retail',src: '', tf: '' },
  currency1:         { ko: '통화1',         en: 'Currency 1',     src: '__fixed__', tf: '' },
  subColor:          { ko: '서브컬러',      en: 'Sub-color',      src: '', tf: '' },
  type:              { ko: '타입',          en: 'Type',           src: '__fixed__', tf: '' },
  userName:          { ko: '작성자',        en: 'User name',      src: '__fixed__', tf: '' },
  userTime:          { ko: '작성시간',      en: 'User time',      src: '__fixed__', tf: '' },
  updateUser:        { ko: '수정자',        en: 'Update user',    src: '__fixed__', tf: '' },
  updateTime:        { ko: '수정시간',      en: 'Update time',    src: '__fixed__', tf: '' },
  index:             { ko: '인덱스',        en: 'Index',          src: '__row_index__', tf: '' },
}

// ─── Customer (113 cols) ──────────────────────────────────────────────────────
export const CUSTOMER_SCHEMA = {
  code:           { ko: '고객코드',     en: 'Customer code',   src: '', tf: '' },
  name:           { ko: '고객명',       en: 'Name',            src: '', tf: '' },
  addr1:          { ko: '주소1',        en: 'Address 1',       src: '', tf: '' },
  addr2:          { ko: '주소2',        en: 'Address 2',       src: '', tf: '' },
  city:           { ko: '도시',         en: 'City',            src: '', tf: '' },
  state:          { ko: '주/지역',      en: 'State',           src: '', tf: '' },
  zip:            { ko: '우편번호',     en: 'Zip code',        src: '', tf: '' },
  country:        { ko: '국가',         en: 'Country',         src: '', tf: '' },
  phone1:         { ko: '전화1',        en: 'Phone 1',         src: '', tf: '' },
  phone2:         { ko: '전화2',        en: 'Phone 2',         src: '', tf: '' },
  fax1:           { ko: '팩스1',        en: 'Fax 1',           src: '__fixed__', tf: '' },
  fax2:           { ko: '팩스2',        en: 'Fax 2',           src: '__fixed__', tf: '' },
  contact1:       { ko: '담당자1',      en: 'Contact 1',       src: '', tf: '' },
  contact2:       { ko: '담당자2',      en: 'Contact 2',       src: '', tf: '' },
  title1:         { ko: '직함1',        en: 'Title 1',         src: '', tf: '' },
  title2:         { ko: '직함2',        en: 'Title 2',         src: '__fixed__', tf: '' },
  email1:         { ko: '이메일1',      en: 'Email 1',         src: '', tf: '' },
  email2:         { ko: '이메일2',      en: 'Email 2',         src: '', tf: '' },
  term:           { ko: '결제조건',     en: 'Payment terms',   src: '', tf: '' },
  shipVia:        { ko: '배송방법',     en: 'Ship via',        src: '__fixed__', tf: '' },
  status:         { ko: '상태',         en: 'Status',          src: '__fixed__', tf: '' },
  division:       { ko: '사업부',       en: 'Division',        src: '__fixed__', tf: '' },
  memo:           { ko: '메모',         en: 'Memo',            src: '', tf: '' },
  warehouse:      { ko: '창고',         en: 'Warehouse',       src: '__fixed__', tf: '' },
  salesRep1:      { ko: '영업담당1',    en: 'Sales rep 1',     src: '', tf: '' },
  salesRep1Rate:  { ko: '커미션율1',    en: 'Commission 1',    src: '__fixed__', tf: '' },
  salesRep2:      { ko: '영업담당2',    en: 'Sales rep 2',     src: '', tf: '' },
  creditLimit:    { ko: '신용한도',     en: 'Credit limit',    src: '__fixed__', tf: '' },
  active:         { ko: '활성',         en: 'Active',          src: '__fixed__', tf: '' },
  priceLevel:     { ko: '가격레벨',     en: 'Price level',     src: '__fixed__', tf: '' },
  routingGuide:   { ko: '라우팅가이드', en: 'Routing guide',   src: '__fixed__', tf: '' },
  currency:       { ko: '통화',         en: 'Currency',        src: '', tf: '' },
  taxNo:          { ko: '세금번호',     en: 'Tax number',      src: '', tf: '' },
  orderDiscountRate: { ko: '주문할인율', en: 'Order discount',  src: '__fixed__', tf: '' },
  type:           { ko: '타입',         en: 'Type',            src: '__fixed__', tf: '' },
  onHold:         { ko: '보류',         en: 'On hold',         src: '__fixed__', tf: '' },
  paymentCode:    { ko: '결제코드',     en: 'Payment code',    src: '__fixed__', tf: '' },
  territory:      { ko: '영업지역',     en: 'Territory',       src: '', tf: '' },
  userName:       { ko: '작성자',       en: 'User name',       src: '__fixed__', tf: '' },
  userTime:       { ko: '작성시간',     en: 'User time',       src: '__fixed__', tf: '' },
  resellerNum:    { ko: '리셀러번호',   en: 'Reseller number', src: '', tf: '' },
  federalId:      { ko: 'Federal ID',   en: 'Federal ID',      src: '', tf: '' },
}

// ─── Inventory (18 cols) ──────────────────────────────────────────────────────
export const INVENTORY_SCHEMA = {
  style:     { ko: '스타일번호', en: 'Style number', src: '', tf: '' },
  color:     { ko: '컬러코드',   en: 'Color code',   src: '', tf: '' },
  warehouse: { ko: '창고',       en: 'Warehouse',    src: '__fixed__', tf: '' },
  unit1:     { ko: '수량1',      en: 'Unit 1',       src: '', tf: '' },
  unit2:     { ko: '수량2',      en: 'Unit 2',       src: '', tf: '' },
  unit3:     { ko: '수량3',      en: 'Unit 3',       src: '', tf: '' },
  unit4:     { ko: '수량4',      en: 'Unit 4',       src: '', tf: '' },
  unit5:     { ko: '수량5',      en: 'Unit 5',       src: '', tf: '' },
  unit6:     { ko: '수량6',      en: 'Unit 6',       src: '', tf: '' },
  unit7:     { ko: '수량7',      en: 'Unit 7',       src: '', tf: '' },
  unit8:     { ko: '수량8',      en: 'Unit 8',       src: '', tf: '' },
  unit9:     { ko: '수량9',      en: 'Unit 9',       src: '', tf: '' },
  unit10:    { ko: '수량10',     en: 'Unit 10',      src: '', tf: '' },
  unit11:    { ko: '수량11',     en: 'Unit 11',      src: '', tf: '' },
  unit12:    { ko: '수량12',     en: 'Unit 12',      src: '', tf: '' },
  unit13:    { ko: '수량13',     en: 'Unit 13',      src: '', tf: '' },
  unit14:    { ko: '수량14',     en: 'Unit 14',      src: '', tf: '' },
  unit15:    { ko: '수량15',     en: 'Unit 15',      src: '', tf: '' },
}

export const SCHEMAS = {
  sales_order:    SALES_ORDER_SCHEMA,
  purchase_order: PURCHASE_ORDER_SCHEMA,
  style:          STYLE_SCHEMA,
  customer:       CUSTOMER_SCHEMA,
  inventory:      INVENTORY_SCHEMA,
}

// Build initial mapping state from schema
export function buildInitialMapping(moduleKey) {
  const schema = SCHEMAS[moduleKey]
  const mapping = {}
  for (const [col, def] of Object.entries(schema)) {
    const isRule = def.tf.startsWith('date:') || def.tf.startsWith('map:') ||
      def.tf.startsWith('prefix:') || def.tf.startsWith('suffix:') ||
      def.tf === 'upper' || def.tf === 'lower'
    mapping[col] = {
      src: def.src,
      tf: isRule ? def.tf : '',
      fixedVal: (!isRule && def.tf) ? def.tf : '',
    }
  }
  return mapping
}

// ─── Desktop N41 Column Definitions ──────────────────────────────────────────
// These are the exact column names from N41 Desktop import templates

export const DESKTOP_COLUMNS = {
  sales_order: [
    'orderno','orderDate','startDate','customer','type','shipTo','billTo',
    'division','PO','releaseNo','shipVia','term','memo','houseMemo',
    'bulkOrder','box','currency','orderDecision','discountRate','memoCode',
    'void','UpdateUser','UpdateTime','routingGuide','priceLevel','shipToStore',
    'dc','paymentcode','freight','misc','taxable1','taxable2','line','style',
    'color','warehouse','cancelDate','status','sizecategory','size','quantity',
    'price','Memo_det','userName','userTime','cancelReason','season','promotion',
    'salesrep1','comrate1','comrate2','TradeShow','bundle','numofnumdle','check_skip',
  ],
  purchase_order: [
    'pono','cut_po','processType','orderDate','startDate','cancelDate','etaDate',
    'shipdate','vendor','division','warehouse','status','shipvia','user1','user2',
    'user3','user4','line','style','color','Sizecat','prepack','unit1','unit2',
    'unit3','unit4','unit5','unit6','unit7','unit8','unit9','unit10','unit11',
    'unit12','unit13','unit14','unit15','unitSum','price',
  ],
  style: [
    'style','color','type','rawMatType','Binlocation','Descript','division',
    'Subdivision','Category','SubCategory','Grp','Season','Sizecat','Cost',
    'Price1','memo','availabledate','bundle','cost1','cost2','cost3','price2',
    'price3','price4','price5','fabcontent','fabricType','ldp','weight',
    'sgtRetailPrice','uom','designer','coo','warehouse','startSellDate',
    'vendor1','fob','vendorpart1','processtype','impCat','user1~user9','reference1',
  ],
  customer: [
    'code','Name','addr1','addr2','city','state','zip','country','contact','phone',
    'Bill to addr1','Bill to addr2','Bill to city','Bill to state','Bill to zip',
    'Bill to country','phone1','phone2','fax1','fax2','contact1','contact2',
    'title1','title2','email1','email2','term','shipvia','status','division',
    'priceLevel','Paymentcode','type','Sales Rep 1','Sales Rep 1 Rate',
    'Sales Rep 2','Sales Rep 2 Rate','warehouse','customerpriority','memo',
  ],
  inventory: [
    'Style #','Color','WAREHOUSE','Unit1','Unit2','Unit3','Unit4','Unit5',
    'Unit6','Unit7','Unit8','Unit9','Unit10','Unit11','Unit12','Unit13',
    'Unit14','Unit15','Total',
  ],
}

// Desktop schema - maps N41 schema keys → Desktop column names
export const DESKTOP_COL_MAP = {
  sales_order: {
    index: 'line', orderNo: 'orderno', orderDate: 'orderDate',
    startDate: 'startDate', customer: 'customer', type: 'type',
    shipTo: 'shipTo', billTo: 'billTo', division: 'division',
    po: 'PO', releaseNo: 'releaseNo', shipVia: 'shipVia', term: 'term',
    memo: 'memo', houseMemo: 'houseMemo', bulkOrder: 'bulkOrder',
    box: 'box', currency: 'currency', orderDecision: 'orderDecision',
    discountRate: 'discountRate', memoCode: 'memoCode', voids: 'void',
    updateUser: 'UpdateUser', updateTime: 'UpdateTime',
    routingGuide: 'routingGuide', priceLevel: 'priceLevel',
    shipToStore: 'shipToStore', dc: 'dc', paymentCode: 'paymentcode',
    freight: 'freight', misc: 'misc', taxable1: 'taxable1', taxable2: 'taxable2',
    line: 'line', style: 'style', color: 'color', warehouse: 'warehouse',
    cancelDate: 'cancelDate', status: 'status', sizeCategory: 'sizecategory',
    size: 'size', quantity: 'quantity', price: 'price', memoDet: 'Memo_det',
    userName: 'userName', userTime: 'userTime', cancelReason: 'cancelReason',
    season: 'season', promotion: 'promotion', salesRep1: 'salesrep1',
    comRate1: 'comrate1', comRate2: 'comrate2', tradeShow: 'TradeShow',
    bundle: 'bundle', numOfBundle: 'numofnumdle', checkSkip: 'check_skip',
  },
  purchase_order: {
    poNo: 'pono', cutPo: 'cut_po', processType: 'processType',
    orderDate: 'orderDate', startDate: 'startDate', cancelDate: 'cancelDate',
    etaDate: 'etaDate', shipDate: 'shipdate', vendor: 'vendor',
    division: 'division', warehouse: 'warehouse', status: 'status',
    shipVia: 'shipvia', user1: 'user1', user2: 'user2', user3: 'user3',
    user4: 'user4', line: 'line', style: 'style', color: 'color',
    sizeCat: 'Sizecat', prepack: 'prepack',
  },
  style: {
    style: 'style', color: 'color', type: 'type', rawMatType: 'rawMatType',
    binLocation: 'Binlocation', descript: 'Descript', division: 'division',
    subdivision: 'Subdivision', category: 'Category', subCategory: 'SubCategory',
    grp: 'Grp', season: 'Season', sizeCat: 'Sizecat', cost: 'Cost',
    price1: 'Price1', memo: 'memo', availableDate: 'availabledate',
    bundle: 'bundle', cost1: 'cost1', cost2: 'cost2', cost3: 'cost3',
    price2: 'price2', price3: 'price3', price4: 'price4', price5: 'price5',
    fabContent: 'fabcontent', fabricType: 'fabricType', ldp: 'ldp',
    weight: 'weight', sgtRetailPrice: 'sgtRetailPrice', uom: 'uom',
    designer: 'designer', coo: 'coo', warehouse: 'warehouse',
    startSellDate: 'startSellDate', vendor1: 'vendor1', fob: 'fob',
    vendorPart1: 'vendorpart1', processType: 'processtype', impCat: 'impCat',
    reference1: 'reference1',
  },
  customer: {
    code: 'code', name: 'Name', addr1: 'addr1', addr2: 'addr2',
    city: 'city', state: 'state', zip: 'zip', country: 'country',
    contact: 'contact', phone: 'phone', billAddr1: 'Bill to addr1',
    billAddr2: 'Bill to addr2', billCity: 'Bill to city', billState: 'Bill to state',
    billZip: 'Bill to zip', billCountry: 'Bill to country',
    phone1: 'phone1', phone2: 'phone2', fax1: 'fax1', fax2: 'fax2',
    contact1: 'contact1', contact2: 'contact2', title1: 'title1', title2: 'title2',
    email1: 'email1', email2: 'email2', term: 'term', shipVia: 'shipvia',
    status: 'status', division: 'division', priceLevel: 'priceLevel',
    paymentCode: 'Paymentcode', type: 'type', salesRep1: 'Sales Rep 1',
    comRate1: 'Sales Rep 1 Rate', salesRep2: 'Sales Rep 2',
    comRate2: 'Sales Rep 2 Rate', warehouse: 'warehouse', memo: 'memo',
  },
  inventory: {
    style: 'Style #', color: 'Color', warehouse: 'WAREHOUSE',
  },
}

// Build mapping pre-filled with Desktop column names as fixed targets
export function buildDesktopMapping(moduleKey) {
  const schema = SCHEMAS[moduleKey]
  const colMap = DESKTOP_COL_MAP[moduleKey] || {}
  const mapping = {}
  for (const [col, def] of Object.entries(schema)) {
    const desktopCol = colMap[col]
    const isRule = def.tf && (def.tf.startsWith('date:') || def.tf.startsWith('map:') ||
      def.tf.startsWith('prefix:') || def.tf.startsWith('suffix:') ||
      def.tf === 'upper' || def.tf === 'lower')
    mapping[col] = {
      src: desktopCol ? desktopCol : def.src,
      tf: isRule ? def.tf : '',
      fixedVal: (!isRule && def.tf) ? def.tf : '',
    }
  }
  return mapping
}

// ─── Cloud N41 Column Definitions ────────────────────────────────────────────

export const CLOUD_COLUMNS = {
  sales_order: [
    'index','orderNo','orderDate','startDate','customer','type','shipTo','billTo',
    'division','po','releaseNo','shipVia','term','memo','houseMemo','bulkOrder',
    'box','currency','orderDecision','discountRate','memoCode','voids','updateUser',
    'updateTime','routingGuide','priceLevel','shipToStore','dc','paymentCode',
    'freight','misc','taxable1','taxable2','line','style','color','warehouse',
    'cancelDate','status','sizeCategory','size','quantity','price','memoDet',
    'userName','userTime','cancelReason','season','promotion','salesRep1','comRate1',
    'salesRep2','comRate2','tradeShow','bundle','numOfBundle','checkSkip',
  ],
  purchase_order: [
    'poNo','cutPo','processType','orderDate','startDate','cancelDate','etaDate',
    'shipDate','vendor','division','warehouse','status','shipVia','user1','user2',
    'user3','user4','line','style','color','unit1','unit2','unit3','unit4','unit5',
    'unit6','unit7','unit8','unit9','unit10','unit11','unit12','unit13','unit14',
    'unit15','unitSum','price',
  ],
  style: [
    'style','color','status','descript','division','subdivision','fabricType',
    'processType','category','subCategory','designer','impCat','season','grp',
    'coo','hsTariffNo','binLocation','binLocation2','availableDate','startSellDate',
    'sizeCat','bundle','fabContent','price1','price2','price3','price4','price5',
    'cost','cost1','cost2','cost3','memo','warehouse','vendor1','vendorPart1',
    'uom','ldp','weight','sgtRetailPrice','reference1','reference2','type',
    'rawMatType','userName','userTime','updateUser','updateTime','index',
  ],
  customer: [
    'code','name','addr1','addr2','city','state','zip','country','phone1','phone2',
    'fax1','fax2','contact1','contact2','title1','title2','email1','email2','term',
    'shipVia','status','division','memo','warehouse','salesRep1','salesRep1Rate',
    'salesRep2','salesRep2Rate','priceLevel','paymentCode','type','priority',
    'customerPriority','user1','user2','user3','user4',
  ],
  inventory: [
    'style','color','warehouse','unit1','unit2','unit3','unit4','unit5','unit6',
    'unit7','unit8','unit9','unit10','unit11','unit12','unit13','unit14','unit15',
  ],
}

export const CLOUD_COL_MAP = {
  sales_order: {
    index: 'index', orderNo: 'orderNo', orderDate: 'orderDate',
    startDate: 'startDate', customer: 'customer', type: 'type',
    shipTo: 'shipTo', billTo: 'billTo', division: 'division',
    po: 'po', releaseNo: 'releaseNo', shipVia: 'shipVia', term: 'term',
    memo: 'memo', houseMemo: 'houseMemo', bulkOrder: 'bulkOrder',
    box: 'box', currency: 'currency', orderDecision: 'orderDecision',
    discountRate: 'discountRate', memoCode: 'memoCode', voids: 'voids',
    updateUser: 'updateUser', updateTime: 'updateTime',
    routingGuide: 'routingGuide', priceLevel: 'priceLevel',
    shipToStore: 'shipToStore', dc: 'dc', paymentCode: 'paymentCode',
    freight: 'freight', misc: 'misc', taxable1: 'taxable1', taxable2: 'taxable2',
    line: 'line', style: 'style', color: 'color', warehouse: 'warehouse',
    cancelDate: 'cancelDate', status: 'status', sizeCategory: 'sizeCategory',
    size: 'size', quantity: 'quantity', price: 'price', memoDet: 'memoDet',
    userName: 'userName', userTime: 'userTime', cancelReason: 'cancelReason',
    season: 'season', promotion: 'promotion', salesRep1: 'salesRep1',
    comRate1: 'comRate1', salesRep2: 'salesRep2', comRate2: 'comRate2',
    tradeShow: 'tradeShow', bundle: 'bundle', numOfBundle: 'numOfBundle',
    checkSkip: 'checkSkip',
  },
  purchase_order: {
    poNo: 'poNo', cutPo: 'cutPo', processType: 'processType',
    orderDate: 'orderDate', startDate: 'startDate', cancelDate: 'cancelDate',
    etaDate: 'etaDate', shipDate: 'shipDate', vendor: 'vendor',
    division: 'division', warehouse: 'warehouse', status: 'status',
    shipVia: 'shipVia', user1: 'user1', user2: 'user2', user3: 'user3',
    user4: 'user4', line: 'line', style: 'style', color: 'color',
    price: 'price',
  },
  style: {
    style: 'style', color: 'color', status: 'status', descript: 'descript',
    division: 'division', subdivision: 'subdivision', fabricType: 'fabricType',
    processType: 'processType', category: 'category', subCategory: 'subCategory',
    designer: 'designer', impCat: 'impCat', season: 'season', grp: 'grp',
    coo: 'coo', binLocation: 'binLocation', availableDate: 'availableDate',
    startSellDate: 'startSellDate', sizeCat: 'sizeCat', bundle: 'bundle',
    fabContent: 'fabContent', price1: 'price1', price2: 'price2',
    price3: 'price3', price4: 'price4', price5: 'price5',
    cost: 'cost', cost1: 'cost1', cost2: 'cost2', cost3: 'cost3',
    memo: 'memo', warehouse: 'warehouse', vendor1: 'vendor1',
    vendorPart1: 'vendorPart1', uom: 'uom', ldp: 'ldp', weight: 'weight',
    sgtRetailPrice: 'sgtRetailPrice', reference1: 'reference1',
    type: 'type', rawMatType: 'rawMatType',
  },
  customer: {
    code: 'code', name: 'name', addr1: 'addr1', addr2: 'addr2',
    city: 'city', state: 'state', zip: 'zip', country: 'country',
    phone1: 'phone1', phone2: 'phone2', fax1: 'fax1', fax2: 'fax2',
    contact1: 'contact1', contact2: 'contact2', title1: 'title1', title2: 'title2',
    email1: 'email1', email2: 'email2', term: 'term', shipVia: 'shipVia',
    status: 'status', division: 'division', memo: 'memo', warehouse: 'warehouse',
    salesRep1: 'salesRep1', comRate1: 'salesRep1Rate',
    salesRep2: 'salesRep2', comRate2: 'salesRep2Rate',
    priceLevel: 'priceLevel', paymentCode: 'paymentCode', type: 'type',
    user1: 'user1', user2: 'user2', user3: 'user3', user4: 'user4',
  },
  inventory: {
    style: 'style', color: 'color', warehouse: 'warehouse',
  },
}

export function buildCloudMapping(moduleKey) {
  const schema = SCHEMAS[moduleKey]
  const colMap = CLOUD_COL_MAP[moduleKey] || {}
  const mapping = {}
  for (const [col, def] of Object.entries(schema)) {
    const cloudCol = colMap[col]
    const isRule = def.tf && (def.tf.startsWith('date:') || def.tf.startsWith('map:') ||
      def.tf.startsWith('prefix:') || def.tf.startsWith('suffix:') ||
      def.tf === 'upper' || def.tf === 'lower')
    mapping[col] = {
      src: cloudCol || def.src,
      tf: isRule ? def.tf : '',
      fixedVal: (!isRule && def.tf) ? def.tf : '',
    }
  }
  return mapping
}
