<script setup>
import { computed } from 'vue'
import { Document, Page, View, Text } from '@ceereals/vue-pdf'

const props = defineProps({ booking: { type: Object, required: true } })

function fmt(n) {
  if (n == null) return 'TBC'
  return `K ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtShort(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
function periodLabel(p) {
  const m = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', tea_break: 'Tea Break', brunch: 'Brunch', afternoon_tea: 'Afternoon Tea' }
  return m[p] ?? (p ?? '').replace(/_/g, ' ')
}
function styleLabel(s) {
  const m = { buffet: 'Buffet', individual_order: 'Individual Order', mixed: 'Mixed' }
  return m[s] ?? (s ?? '').replace(/_/g, ' ')
}

const isCorporate = computed(() => props.booking.bookingType === 'corporate')

const s = {
  page:       { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#28180d' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: '#743a1c' },
  brandName:  { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#743a1c' },
  brandSub:   { fontSize: 9, color: '#86736b', marginTop: 3 },
  docTitle:   { fontSize: 22, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: '#28180d' },
  docSub:     { fontSize: 9, color: '#86736b', textAlign: 'right', marginTop: 4 },
  badge:      { alignSelf: 'flex-end', marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4, backgroundColor: '#743a1c' },
  badgeText:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff' },

  metaRow:    { flexDirection: 'row', marginBottom: 16, gap: 16 },
  metaBox:    { flex: 1, backgroundColor: '#fff1ea', padding: 12, borderRadius: 4 },
  stayRow:    { flexDirection: 'row', gap: 12, marginBottom: 24, backgroundColor: '#fff1ea', padding: 12, borderRadius: 4 },
  stayItem:   { flex: 1 },
  metaLabel:  { fontSize: 8, color: '#86736b', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  metaValue:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#28180d', marginBottom: 2 },
  metaSmall:  { fontSize: 9, color: '#53433d', marginTop: 2 },

  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#86736b', textTransform: 'uppercase', marginBottom: 8, marginTop: 20 },

  // Buffet flat-row table
  tableHeader: { flexDirection: 'row', backgroundColor: '#28180d', padding: 8, borderRadius: 4, marginBottom: 1 },
  thText:      { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' },
  tableRow:    { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#ffeade', alignItems: 'flex-start' },
  tableRowAlt: { flexDirection: 'row', padding: 8, backgroundColor: '#fff8f5', borderBottomWidth: 1, borderBottomColor: '#ffeade', alignItems: 'flex-start' },
  colSession:  { flex: 1 },                          // View — flex: 1 in row parent is correct
  cellSmall:   { fontSize: 8, color: '#86736b', marginTop: 2 },
  cellBody:    { fontSize: 9, color: '#28180d' },
  colPeriod:   { width: 66 },                        // width only — no color override
  colStyle:    { width: 76 },
  colCovers:   { width: 44, textAlign: 'center' },
  colUnit:     { width: 62, textAlign: 'right' },
  colAmt:      { width: 72, textAlign: 'right' },

  // Individual-order session block
  // indivHeader is flexDirection: 'row' — its direct children are a View (flex:1) and a Text (fixed width)
  indivHeader: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f5ede8', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#ffeade' },
  indivLeft:   { flex: 1 },                          // View in row parent — correct
  indivTitle:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#28180d' },  // no flex — Text in column parent
  indivMeta:   { fontSize: 8, color: '#86736b', marginTop: 3 },
  indivAmt:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#743a1c', width: 72, textAlign: 'right' },

  attBlock:    { borderBottomWidth: 1, borderBottomColor: '#ffeade', marginLeft: 0 },
  attRow:      { flexDirection: 'row', alignItems: 'baseline', paddingLeft: 20, paddingRight: 8, paddingTop: 5, paddingBottom: 2 },
  attName:     { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#28180d' },
  attId:       { fontSize: 8, color: '#86736b' },
  attSubtotal: { fontSize: 9, color: '#53433d', width: 72, textAlign: 'right' },
  orderRow:    { flexDirection: 'row', paddingLeft: 28, paddingRight: 8, paddingBottom: 3 },
  orderName:   { flex: 1, fontSize: 9, color: '#53433d' },  // Text in row parent — flex: 1 is correct here
  orderAmt:    { fontSize: 9, color: '#53433d', width: 72, textAlign: 'right' },

  totals:      { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  subBlock:    { flexDirection: 'column', gap: 4 },
  totalRow:    { flexDirection: 'row', paddingVertical: 2 },
  totalLabel:  { width: 140, textAlign: 'right', paddingRight: 16, color: '#86736b' },
  totalValue:  { width: 80, textAlign: 'right' },
  totalBold:   { width: 80, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  grandBlock:  { flexDirection: 'column', backgroundColor: '#743a1c', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, justifyContent: 'center', alignItems: 'flex-end' },
  grandLabel:  { color: '#ffdbcc', fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 4 },
  grandValue:  { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold' },

  tbcNote:     { marginTop: 8, fontSize: 8, color: '#86736b', fontStyle: 'italic' },
  notes:       { marginTop: 24, padding: 12, backgroundColor: '#fff1ea', borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#743a1c' },
  notesLabel:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#86736b', textTransform: 'uppercase', marginBottom: 4 },
  notesText:   { fontSize: 9, color: '#53433d', lineHeight: 1.5 },
  footer:      { position: 'absolute', bottom: 30, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#d8c2b9', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:  { fontSize: 8, color: '#86736b' },
}

const hasTBC = computed(() => props.booking.sessions.some(s => s.subtotal == null))
</script>

<template>
  <Document title="Meal Booking Proforma Invoice">
    <Page size="A4" :style="s.page">

      <!-- Header -->
      <View :style="s.header">
        <View>
          <Text :style="s.brandName">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
          <Text :style="s.brandSub">Hospitality &amp; Catering Services</Text>
        </View>
        <View>
          <Text :style="s.docTitle">PROFORMA INVOICE</Text>
          <Text :style="s.docSub">Generated {{ fmtDate(new Date().toISOString().slice(0, 10)) }}</Text>
          <View :style="s.badge">
            <Text :style="s.badgeText">{{ isCorporate ? 'CORPORATE CATERING' : 'INDIVIDUAL DINING' }}</Text>
          </View>
        </View>
      </View>

      <!-- Corporate: Bill From + Bill To -->
      <template v-if="isCorporate">
        <View :style="s.metaRow">
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill From</Text>
            <Text :style="s.metaValue">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
            <Text :style="s.metaSmall">Hospitality &amp; Catering Services</Text>
            <Text v-if="booking.lodgeAddress" :style="s.metaSmall">{{ booking.lodgeAddress }}</Text>
            <Text v-if="booking.lodgeEmail"   :style="s.metaSmall">{{ booking.lodgeEmail }}</Text>
            <Text v-if="booking.lodgePhone"   :style="s.metaSmall">{{ booking.lodgePhone }}</Text>
          </View>
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill To</Text>
            <Text :style="s.metaValue">{{ booking.corporateClient.companyName }}</Text>
            <Text v-if="booking.corporateClient.contactPerson" :style="s.metaSmall">Attn: {{ booking.corporateClient.contactPerson }}</Text>
            <Text v-if="booking.corporateClient.email"         :style="s.metaSmall">{{ booking.corporateClient.email }}</Text>
            <Text v-if="booking.corporateClient.phone"         :style="s.metaSmall">{{ booking.corporateClient.phone }}</Text>
            <Text v-if="booking.corporateClient.tpin"          :style="s.metaSmall">TPIN: {{ booking.corporateClient.tpin }}</Text>
            <Text v-if="booking.corporateClient.costCenter"    :style="s.metaSmall">
              {{ booking.corporateClient.costCenterType === 'internal_order' ? 'Internal Order No.' : 'Cost Centre' }}: {{ booking.corporateClient.costCenter }}
            </Text>
            <Text v-if="booking.corporateClient.glCode" :style="s.metaSmall">GL Code: {{ booking.corporateClient.glCode }}</Text>
          </View>
        </View>
        <View :style="s.stayRow">
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Start Date</Text>
            <Text :style="s.metaSmall">{{ fmtDate(booking.startDate) }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">End Date</Text>
            <Text :style="s.metaSmall">{{ fmtDate(booking.endDate) }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Duration</Text>
            <Text :style="s.metaSmall">{{ booking.dayCount }} {{ booking.dayCount === 1 ? 'day' : 'days' }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Diners</Text>
            <Text :style="s.metaSmall">{{ booking.dinerCount }} cover{{ booking.dinerCount !== 1 ? 's' : '' }}</Text>
          </View>
          <View v-if="booking.reasonForBooking" :style="[s.stayItem, { flex: 2 }]">
            <Text :style="s.metaLabel">Reason</Text>
            <Text :style="s.metaSmall">{{ booking.reasonForBooking }}</Text>
          </View>
        </View>
      </template>

      <!-- Individual: Bill From + Bill To + plan strip -->
      <template v-else>
        <View :style="s.metaRow">
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill From</Text>
            <Text :style="s.metaValue">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
            <Text :style="s.metaSmall">Hospitality &amp; Catering Services</Text>
            <Text v-if="booking.lodgeAddress" :style="s.metaSmall">{{ booking.lodgeAddress }}</Text>
            <Text v-if="booking.lodgeEmail"   :style="s.metaSmall">{{ booking.lodgeEmail }}</Text>
            <Text v-if="booking.lodgePhone"   :style="s.metaSmall">{{ booking.lodgePhone }}</Text>
          </View>
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill To</Text>
            <Text :style="s.metaValue">{{ `${booking.guestInfo.firstName} ${booking.guestInfo.lastName}`.trim() || '—' }}</Text>
            <Text v-if="booking.guestInfo.email" :style="s.metaSmall">{{ booking.guestInfo.email }}</Text>
            <Text v-if="booking.guestInfo.phone" :style="s.metaSmall">{{ booking.guestInfo.phone }}</Text>
          </View>
        </View>
        <View :style="s.stayRow">
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Start Date</Text>
            <Text :style="s.metaSmall">{{ fmtDate(booking.startDate) }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">End Date</Text>
            <Text :style="s.metaSmall">{{ fmtDate(booking.endDate) }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Duration</Text>
            <Text :style="s.metaSmall">{{ booking.dayCount }} {{ booking.dayCount === 1 ? 'day' : 'days' }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Diners</Text>
            <Text :style="s.metaSmall">{{ booking.dinerCount }} cover{{ booking.dinerCount !== 1 ? 's' : '' }}</Text>
          </View>
          <View v-if="booking.reasonForBooking" :style="[s.stayItem, { flex: 2 }]">
            <Text :style="s.metaLabel">Reason</Text>
            <Text :style="s.metaSmall">{{ booking.reasonForBooking }}</Text>
          </View>
        </View>
      </template>

      <!-- Session breakdown -->
      <Text :style="s.sectionTitle">Meal Sessions &amp; Cost Estimate</Text>

      <!-- Table header (for buffet / headcount rows) -->
      <View :style="s.tableHeader">
        <Text :style="[s.thText, { flex: 1 }]">Session</Text>
        <Text :style="[s.thText, s.colPeriod]">Period</Text>
        <Text :style="[s.thText, s.colStyle]">Service</Text>
        <Text :style="[s.thText, s.colCovers]">Covers</Text>
        <Text :style="[s.thText, s.colUnit]">Unit</Text>
        <Text :style="[s.thText, s.colAmt]">Amount</Text>
      </View>

      <template v-for="(sess, i) in booking.sessions" :key="i">

        <!-- Buffet or headcount individual (no per-attendant breakdown) -->
        <template v-if="!sess.attendantOrders || !sess.attendantOrders.length">
          <View :style="i % 2 === 0 ? s.tableRow : s.tableRowAlt">
            <View :style="s.colSession">
              <Text :style="s.cellBody">{{ sess.sessionName || periodLabel(sess.mealPeriod) }}</Text>
              <Text v-if="sess.date" :style="s.cellSmall">{{ fmtShort(sess.date) }}</Text>
              <Text v-if="sess.serviceType === 'buffet' && sess.buffetName" :style="s.cellSmall">{{ sess.buffetName }}</Text>
            </View>
            <Text :style="[s.cellBody, s.colPeriod]">{{ periodLabel(sess.mealPeriod) }}</Text>
            <Text :style="[s.cellBody, s.colStyle]">{{ styleLabel(sess.serviceType) }}</Text>
            <Text :style="[s.cellBody, s.colCovers]">{{ sess.paxCount }}</Text>
            <Text :style="[s.cellBody, s.colUnit]">{{ sess.unitPrice ? `K ${sess.unitPrice}` : 'TBC' }}</Text>
            <Text :style="[s.cellBody, s.colAmt]">{{ fmt(sess.subtotal) }}</Text>
          </View>
        </template>

        <!-- Individual order session — expanded per attendant -->
        <template v-else>
          <!-- Session header row -->
          <View :style="s.indivHeader">
            <View :style="s.indivLeft">
              <Text :style="s.indivTitle">{{ sess.sessionName || periodLabel(sess.mealPeriod) }}</Text>
              <Text :style="s.indivMeta">{{ fmtShort(sess.date) }} · {{ periodLabel(sess.mealPeriod) }} · {{ styleLabel(sess.serviceType) }} · {{ sess.paxCount }} cover{{ sess.paxCount !== 1 ? 's' : '' }}</Text>
            </View>
            <Text :style="s.indivAmt">{{ fmt(sess.subtotal) }}</Text>
          </View>
          <!-- Per-attendant blocks -->
          <View v-for="(att, ai) in sess.attendantOrders" :key="ai" :style="s.attBlock">
            <View :style="s.attRow">
              <Text :style="s.attName">{{ att.name }}</Text>
              <Text v-if="att.idNumber" :style="s.attId"> · {{ att.idNumber }}</Text>
            </View>
            <View v-for="(order, oi) in att.orders" :key="oi" :style="s.orderRow">
              <Text :style="s.orderName">{{ order.name }}{{ order.quantity > 1 ? ` × ${order.quantity}` : '' }}</Text>
              <Text :style="s.orderAmt">{{ fmt(order.subtotal) }}</Text>
            </View>
          </View>
        </template>

      </template>

      <!-- TBC note -->
      <Text v-if="hasTBC" :style="s.tbcNote">
        * Prices for sessions without menu item selections will be confirmed upon booking review.
      </Text>

      <!-- Totals -->
      <View v-if="booking.baseTotal > 0" :style="s.totals">
        <View :style="s.subBlock">
          <View :style="s.totalRow">
            <Text :style="s.totalLabel">Subtotal</Text>
            <Text :style="s.totalBold">{{ fmt(booking.baseTotal) }}</Text>
          </View>
          <View :style="s.totalRow">
            <Text :style="s.totalLabel">VAT (16%)</Text>
            <Text :style="s.totalValue">{{ fmt(booking.taxes) }}</Text>
          </View>
        </View>
        <View :style="s.grandBlock">
          <Text :style="s.grandLabel">Est. Total Payable</Text>
          <Text :style="s.grandValue">{{ fmt(booking.grandTotal) }}</Text>
        </View>
      </View>

      <!-- Special requests -->
      <View v-if="booking.specialRequests" :style="s.notes">
        <Text :style="s.notesLabel">Special Requests</Text>
        <Text :style="s.notesText">{{ booking.specialRequests }}</Text>
      </View>

      <!-- Footer -->
      <View :style="s.footer" fixed>
        <Text :style="s.footerText">{{ booking.lodgeName || 'Mwakwanda' }} — Proforma Invoice</Text>
        <Text :style="s.footerText">This is an estimate; final billing may vary.</Text>
      </View>

    </Page>
  </Document>
</template>
