// Dummy data for corporate booking flow — used while backend is in development.
// Mirrors the Schema v2 hierarchy: company → branch → profile.

export const DUMMY_COMPANIES = [
  {
    id: 'comp-001',
    name: 'Zambia Revenue Authority',
    registrationNo: 'ZRA-001',
    industry: 'Government & Public Sector',
    billingEmail: 'billing@zra.zm',
    website: 'www.zra.zm',
  },
  {
    id: 'comp-002',
    name: 'First National Bank Zambia',
    registrationNo: 'FNB-ZM-2001',
    industry: 'Banking & Finance',
    billingEmail: 'corporate@fnbzambia.com',
  },
  {
    id: 'comp-003',
    name: 'Zambia Consolidated Copper Mines',
    registrationNo: 'ZCCM-IH-0045',
    industry: 'Mining & Quarrying',
    billingEmail: 'accounts@zccm.com',
  },
  {
    id: 'comp-004',
    name: 'United Nations Development Programme',
    registrationNo: 'UNDP-ZM-2000',
    industry: 'Non-Governmental Organizations',
    billingEmail: 'finance@undpzambia.org',
  },
  {
    id: 'comp-005',
    name: 'Airtel Zambia Limited',
    registrationNo: 'AZ-TELCO-0012',
    industry: 'Telecommunications',
    billingEmail: 'corporate@airtelzambia.com',
  },
  {
    id: 'comp-006',
    name: 'Standard Chartered Bank Zambia',
    registrationNo: 'SCB-ZM-1998',
    industry: 'Banking & Finance',
    billingEmail: 'corporate@sc.com',
  },
  {
    id: 'comp-007',
    name: 'National Health Insurance Management Authority',
    registrationNo: 'NHIMA-001',
    industry: 'Government & Public Sector',
    billingEmail: 'finance@nhima.co.zm',
  },
]

export const DUMMY_BRANCHES = {
  'comp-001': [
    { id: 'br-001-1', companyId: 'comp-001', name: 'Lusaka Head Office', isPrimary: true, phone: '+260 211 000 001', email: 'lusaka@zra.zm' },
    { id: 'br-001-2', companyId: 'comp-001', name: 'Ndola Regional Office', isPrimary: false, phone: '+260 212 000 001', email: 'ndola@zra.zm' },
    { id: 'br-001-3', companyId: 'comp-001', name: 'Kitwe Branch', isPrimary: false, phone: '+260 212 000 002', email: 'kitwe@zra.zm' },
  ],
  'comp-002': [
    { id: 'br-002-1', companyId: 'comp-002', name: 'Cairo Road Branch', isPrimary: true, phone: '+260 211 222 000', email: 'cairo@fnbzambia.com' },
    { id: 'br-002-2', companyId: 'comp-002', name: 'Woodlands Branch', isPrimary: false, phone: '+260 211 333 000', email: 'woodlands@fnbzambia.com' },
  ],
  'comp-003': [
    { id: 'br-003-1', companyId: 'comp-003', name: 'Lusaka Head Office', isPrimary: true, phone: '+260 211 111 000', email: 'hq@zccm.com' },
    { id: 'br-003-2', companyId: 'comp-003', name: 'Chingola Office', isPrimary: false, phone: '+260 212 111 000', email: 'chingola@zccm.com' },
  ],
  'comp-004': [
    { id: 'br-004-1', companyId: 'comp-004', name: 'Lusaka Country Office', isPrimary: true, phone: '+260 211 500 000', email: 'lusaka@undp.org' },
  ],
  'comp-005': [
    { id: 'br-005-1', companyId: 'comp-005', name: 'Lusaka Head Office', isPrimary: true, phone: '+260 211 900 000', email: 'hq@airtelzambia.com' },
    { id: 'br-005-2', companyId: 'comp-005', name: 'Ndola Regional Office', isPrimary: false, phone: '+260 212 900 000', email: 'ndola@airtelzambia.com' },
  ],
  'comp-006': [
    { id: 'br-006-1', companyId: 'comp-006', name: 'Cairo Road Branch', isPrimary: true, phone: '+260 211 110 001', email: 'cairo@sc.com' },
    { id: 'br-006-2', companyId: 'comp-006', name: 'Levy Junction Branch', isPrimary: false, phone: '+260 211 110 002', email: 'levy@sc.com' },
  ],
  'comp-007': [
    { id: 'br-007-1', companyId: 'comp-007', name: 'Lusaka Head Office', isPrimary: true, phone: '+260 211 700 001', email: 'info@nhima.co.zm' },
    { id: 'br-007-2', companyId: 'comp-007', name: 'Copperbelt Office', isPrimary: false, phone: '+260 212 700 001', email: 'copperbelt@nhima.co.zm' },
  ],
}

export const DUMMY_PROFILES = {
  'br-001-1': [
    { id: 'prof-001-1-1', branchId: 'br-001-1', departmentName: 'Finance Department', costCenter: 'CC-FIN-001', glCode: 'GL-7700', approverName: 'John Banda', approverEmail: 'j.banda@zra.zm', approverPhone: '+260 97 111 0001', approverTitle: 'Finance Manager' },
    { id: 'prof-001-1-2', branchId: 'br-001-1', departmentName: 'Human Resources', costCenter: 'CC-HR-002', glCode: 'GL-7800', approverName: 'Mary Phiri', approverEmail: 'm.phiri@zra.zm', approverPhone: '+260 97 111 0002', approverTitle: 'HR Director' },
    { id: 'prof-001-1-3', branchId: 'br-001-1', departmentName: 'Operations', costCenter: 'CC-OPS-003', glCode: 'GL-6500', approverName: 'David Mutale', approverEmail: 'd.mutale@zra.zm', approverPhone: '+260 97 111 0003', approverTitle: 'Operations Head' },
  ],
  'br-001-2': [
    { id: 'prof-001-2-1', branchId: 'br-001-2', departmentName: 'Administration', costCenter: 'CC-ADM-010', glCode: 'GL-7100', approverName: 'Grace Mwansa', approverEmail: 'g.mwansa@zra.zm', approverPhone: '+260 97 222 0001', approverTitle: 'Regional Director' },
  ],
  'br-001-3': [
    { id: 'prof-001-3-1', branchId: 'br-001-3', departmentName: 'Administration', costCenter: 'CC-ADM-011', glCode: 'GL-7101', approverName: 'Paul Mwale', approverEmail: 'p.mwale@zra.zm', approverPhone: '+260 97 222 0002', approverTitle: 'Branch Manager' },
  ],
  'br-002-1': [
    { id: 'prof-002-1-1', branchId: 'br-002-1', departmentName: 'Corporate Banking', costCenter: 'CC-CORP-001', glCode: 'GL-4500', approverName: 'Peter Simwanza', approverEmail: 'p.simwanza@fnbzambia.com', approverPhone: '+260 97 333 0001', approverTitle: 'Head of Corporate Banking' },
    { id: 'prof-002-1-2', branchId: 'br-002-1', departmentName: 'IT Department', costCenter: 'CC-IT-002', glCode: 'GL-4800', approverName: 'Sandra Moyo', approverEmail: 's.moyo@fnbzambia.com', approverPhone: '+260 97 333 0002', approverTitle: 'CTO' },
  ],
  'br-003-1': [
    { id: 'prof-003-1-1', branchId: 'br-003-1', departmentName: 'Exploration & Development', costCenter: 'CC-EXP-001', glCode: 'GL-8100', approverName: 'Robert Tembo', approverEmail: 'r.tembo@zccm.com', approverPhone: '+260 97 444 0001', approverTitle: 'VP Exploration' },
    { id: 'prof-003-1-2', branchId: 'br-003-1', departmentName: 'Corporate Affairs', costCenter: 'CC-CORP-002', glCode: 'GL-7200', approverName: 'Angela Mwape', approverEmail: 'a.mwape@zccm.com', approverPhone: '+260 97 444 0002', approverTitle: 'Corporate Affairs Director' },
  ],
  'br-004-1': [
    { id: 'prof-004-1-1', branchId: 'br-004-1', departmentName: 'Programme Management', costCenter: 'CC-PROG-001', glCode: 'GL-UN-001', approverName: 'Sophie Lungu', approverEmail: 's.lungu@undp.org', approverPhone: '+260 97 555 0001', approverTitle: 'Country Director' },
  ],
  'br-005-1': [
    { id: 'prof-005-1-1', branchId: 'br-005-1', departmentName: 'Commercial', costCenter: 'CC-COM-001', glCode: 'GL-COM-01', approverName: 'James Mulenga', approverEmail: 'j.mulenga@airtelzambia.com', approverPhone: '+260 97 666 0001', approverTitle: 'Chief Commercial Officer' },
  ],
  'br-006-1': [
    { id: 'prof-006-1-1', branchId: 'br-006-1', departmentName: 'Trade Finance', costCenter: 'CC-TF-001', glCode: 'GL-SC-001', approverName: 'Linda Chanda', approverEmail: 'l.chanda@sc.com', approverPhone: '+260 97 777 0001', approverTitle: 'Head of Trade Finance' },
  ],
  'br-007-1': [
    { id: 'prof-007-1-1', branchId: 'br-007-1', departmentName: 'Benefits Management', costCenter: 'CC-BEN-001', glCode: 'GL-NH-001', approverName: 'Charles Kabwe', approverEmail: 'c.kabwe@nhima.co.zm', approverPhone: '+260 97 888 0001', approverTitle: 'Director General' },
    { id: 'prof-007-1-2', branchId: 'br-007-1', departmentName: 'Finance & Accounts', costCenter: 'CC-FIN-002', glCode: 'GL-NH-002', approverName: 'Esther Mumba', approverEmail: 'e.mumba@nhima.co.zm', approverPhone: '+260 97 888 0002', approverTitle: 'Chief Finance Officer' },
  ],
}

export const DUMMY_CONFERENCE_ROOMS = [
  { id: 'cr-001', name: 'Baobab Hall', capacity: 200, halfDayPrice: 1500, fullDayPrice: 2500, hourlyPrice: 350, amenities: { projector: true, avSystem: true, ac: true, whiteboard: true, paSystem: true } },
  { id: 'cr-002', name: 'Savannah Suite', capacity: 50, halfDayPrice: 800, fullDayPrice: 1400, hourlyPrice: 200, amenities: { projector: true, videoConferencing: true, ac: true, whiteboard: true } },
  { id: 'cr-003', name: 'Msasa Boardroom', capacity: 20, halfDayPrice: 500, fullDayPrice: 900, hourlyPrice: 120, amenities: { projector: true, videoConferencing: true, ac: true } },
  { id: 'cr-004', name: 'Chikanda Terrace', capacity: 120, halfDayPrice: 1200, fullDayPrice: 2000, hourlyPrice: 280, amenities: { paSystem: true, ac: true } },
  { id: 'cr-005', name: 'Zambezi Ballroom', capacity: 350, halfDayPrice: 2500, fullDayPrice: 4500, hourlyPrice: 600, amenities: { projector: true, avSystem: true, paSystem: true, ac: true, stage: true } },
]

export function searchCompanies(query) {
  if (!query || query.trim().length < 2) return []
  const q = query.toLowerCase().trim()
  return DUMMY_COMPANIES.filter(
    c =>
      c.name.toLowerCase().includes(q) ||
      (c.registrationNo && c.registrationNo.toLowerCase().includes(q))
  )
}

export function lookupByTpin(tpin) {
  if (!tpin || tpin.trim().length < 2) return []
  const q = tpin.toLowerCase().trim()
  return DUMMY_COMPANIES.filter(c =>
    c.registrationNo && c.registrationNo.toLowerCase().includes(q)
  )
}

export function getBranchesForCompany(companyId) {
  return DUMMY_BRANCHES[companyId] ?? []
}

export function getProfilesForBranch(branchId) {
  return DUMMY_PROFILES[branchId] ?? []
}
