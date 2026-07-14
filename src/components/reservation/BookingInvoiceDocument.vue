<script setup>
import { computed } from 'vue'
import { Document, Page, View, Text } from '@ceereals/vue-pdf'

const props = defineProps({
  booking: { type: Object, required: true },
})

function fmt(n) {
  return `K ${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
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

  tableHeader:  { flexDirection: 'row', backgroundColor: '#28180d', padding: 8, borderRadius: 4, marginBottom: 1 },
  thText:       { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' },
  tableRow:     { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#ffeade' },
  tableRowAlt:  { flexDirection: 'row', padding: 8, backgroundColor: '#fff8f5', borderBottomWidth: 1, borderBottomColor: '#ffeade' },
  colName:      { flex: 1 },
  colId:        { width: 120 },
  colEmail:     { width: 140, textAlign: 'right' },

  costHeader:  { flexDirection: 'row', backgroundColor: '#28180d', padding: 8, borderRadius: 4, marginBottom: 1 },
  costRow:     { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: '#ffeade' },
  costRowAlt:  { flexDirection: 'row', padding: 8, backgroundColor: '#fff8f5', borderBottomWidth: 1, borderBottomColor: '#ffeade' },
  colDesc:     { flex: 1 },
  colAmt:      { width: 100, textAlign: 'right' },

  guestBlock:     { paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#ffeade' },
  guestHeaderRow: { flexDirection: 'row' },
  guestNameText:  { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#28180d' },
  guestIdText:    { fontSize: 9, color: '#86736b' },
  roomLineRow:    { flexDirection: 'row', paddingLeft: 12, paddingTop: 4 },
  roomLineDesc:   { flex: 1, fontSize: 9, color: '#53433d' },
  roomLineAmt:    { width: 100, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#28180d', textAlign: 'right' },

  totals:      { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  subBlock:    { flexDirection: 'column', gap: 4 },
  totalRow:    { flexDirection: 'row', paddingVertical: 2 },
  totalLabel:  { width: 120, textAlign: 'right', paddingRight: 16, color: '#86736b' },
  totalValue:  { width: 100, textAlign: 'right' },
  totalBold:   { width: 100, textAlign: 'right', fontFamily: 'Helvetica-Bold' },
  grandBlock:  { flexDirection: 'column', backgroundColor: '#743a1c', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, justifyContent: 'center', alignItems: 'flex-end' },
  grandLabel:  { color: '#ffdbcc', fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 4 },
  grandValue:  { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold' },

  notes:       { marginTop: 24, padding: 12, backgroundColor: '#fff1ea', borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#743a1c' },
  notesLabel:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#86736b', textTransform: 'uppercase', marginBottom: 4 },
  notesText:   { fontSize: 9, color: '#53433d', lineHeight: 1.5 },

  footer:      { position: 'absolute', bottom: 30, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#d8c2b9', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText:  { fontSize: 8, color: '#86736b' },
}
</script>

<template>
  <Document title="Accommodation Proforma Invoice">
    <Page size="A4" :style="s.page">

      <!-- Header -->
      <View :style="s.header">
        <View>
          <Text :style="s.brandName">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
          <Text :style="s.brandSub">Hospitality &amp; Accommodation</Text>
        </View>
        <View>
          <Text :style="s.docTitle">PROFORMA INVOICE</Text>
          <Text :style="s.docSub">Generated {{ fmtDate(new Date().toISOString().slice(0, 10)) }}</Text>
          <View :style="s.badge">
            <Text :style="s.badgeText">{{ isCorporate ? 'CORPORATE ACCOMMODATION' : 'INDIVIDUAL ACCOMMODATION' }}</Text>
          </View>
        </View>
      </View>

      <!-- Corporate: Bill From + Bill To -->
      <template v-if="isCorporate">
        <View :style="s.metaRow">
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill From</Text>
            <Text :style="s.metaValue">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
            <Text :style="s.metaSmall">Hospitality &amp; Accommodation</Text>
            <Text v-if="booking.lodgeAddress" :style="s.metaSmall">{{ booking.lodgeAddress }}</Text>
            <Text v-if="booking.lodgeEmail" :style="s.metaSmall">{{ booking.lodgeEmail }}</Text>
            <Text v-if="booking.lodgePhone" :style="s.metaSmall">{{ booking.lodgePhone }}</Text>
          </View>
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill To</Text>
            <Text :style="s.metaValue">{{ booking.corporateClient.companyName }}</Text>
            <Text v-if="booking.corporateClient.contactPerson" :style="s.metaSmall">Attn: {{ booking.corporateClient.contactPerson }}</Text>
            <Text v-if="booking.corporateClient.email" :style="s.metaSmall">{{ booking.corporateClient.email }}</Text>
            <Text v-if="booking.corporateClient.phone" :style="s.metaSmall">{{ booking.corporateClient.phone }}</Text>
            <Text v-if="booking.corporateClient.tpin" :style="s.metaSmall">TPIN: {{ booking.corporateClient.tpin }}</Text>
            <Text v-if="booking.corporateClient.costCenter" :style="s.metaSmall">{{ booking.corporateClient.costCenterType === 'internal_order' ? 'Internal Order No.' : 'Cost Centre' }}: {{ booking.corporateClient.costCenter }}</Text>
            <Text v-if="booking.corporateClient.glCode" :style="s.metaSmall">GL Code: {{ booking.corporateClient.glCode }}</Text>
          </View>
        </View>
        <!-- Stay summary row -->
        <View :style="s.stayRow">
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Room / Type</Text>
            <Text :style="s.metaSmall">{{ booking.roomType || 'Accommodation' }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">No. of Rooms</Text>
            <Text :style="s.metaSmall">{{ booking.roomCount ?? '—' }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Check-in</Text>
            <Text :style="s.metaSmall">{{ fmtDate(booking.checkIn) }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Check-out</Text>
            <Text :style="s.metaSmall">{{ fmtDate(booking.checkOut) }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Duration</Text>
            <Text :style="s.metaSmall">{{ booking.nightCount }} {{ booking.nightCount === 1 ? 'night' : 'nights' }}</Text>
          </View>
        </View>
      </template>

      <!-- Individual: Bill From + Bill To + Stay Strip -->
      <template v-else>
        <View :style="s.metaRow">
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill From</Text>
            <Text :style="s.metaValue">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
            <Text :style="s.metaSmall">Hospitality &amp; Accommodation</Text>
            <Text v-if="booking.lodgeAddress" :style="s.metaSmall">{{ booking.lodgeAddress }}</Text>
            <Text v-if="booking.lodgeEmail" :style="s.metaSmall">{{ booking.lodgeEmail }}</Text>
            <Text v-if="booking.lodgePhone" :style="s.metaSmall">{{ booking.lodgePhone }}</Text>
          </View>
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill To</Text>
            <Text :style="s.metaValue">{{ `${booking.guestInfo.firstName} ${booking.guestInfo.lastName}` }}</Text>
            <Text v-if="booking.guestInfo.email" :style="s.metaSmall">{{ booking.guestInfo.email }}</Text>
            <Text v-if="booking.guestInfo.phone" :style="s.metaSmall">{{ booking.guestInfo.phone }}</Text>
          </View>
        </View>
        <View :style="s.stayRow">
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Room / Type</Text>
            <Text :style="s.metaSmall">{{ booking.roomType || 'Accommodation' }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Check-in</Text>
            <Text :style="s.metaSmall">{{ fmtDate(booking.checkIn) }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Check-out</Text>
            <Text :style="s.metaSmall">{{ fmtDate(booking.checkOut) }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Duration</Text>
            <Text :style="s.metaSmall">{{ booking.nightCount }} {{ booking.nightCount === 1 ? 'night' : 'nights' }}</Text>
          </View>
          <View :style="s.stayItem">
            <Text :style="s.metaLabel">Guests</Text>
            <Text :style="s.metaSmall">{{ booking.guestCount }} {{ booking.guestCount === 1 ? 'Adult' : 'Adults' }}</Text>
          </View>
        </View>
      </template>

      <!-- Cost breakdown -->
      <Text :style="s.sectionTitle">Cost Breakdown</Text>
      <View :style="s.costHeader">
        <Text :style="[s.thText, s.colDesc]">Description</Text>
        <Text :style="[s.thText, s.colAmt]">Amount</Text>
      </View>
      <!-- Per-guest blocks: each guest then their room line item -->
      <template v-if="booking.corporateGuests && booking.corporateGuests.length">
        <View v-for="(g, gi) in booking.corporateGuests" :key="gi" :style="s.guestBlock">
          <View :style="s.guestHeaderRow">
            <Text :style="s.guestNameText">{{ g.fullName || '—' }}</Text>
            <Text v-if="g.idNumber" :style="s.guestIdText">  {{ g.idNumber }}</Text>
          </View>
          <View v-if="g.roomName" :style="s.roomLineRow">
            <Text :style="s.roomLineDesc">→ {{ g.roomName }}{{ g.roomRate ? ` @ K${Number(g.roomRate.toFixed(0)).toLocaleString()} × ${booking.nightCount} ${booking.nightCount === 1 ? 'Night' : 'Nights'}` : '' }}</Text>
            <Text v-if="g.roomTotal" :style="s.roomLineAmt">{{ fmt(g.roomTotal) }}</Text>
          </View>
        </View>
      </template>
      <!-- Fallback: per-room rows when no guest data -->
      <template v-else-if="booking.rooms && booking.rooms.length">
        <View v-for="(r, i) in booking.rooms" :key="i" :style="i % 2 === 0 ? s.costRow : s.costRowAlt">
          <Text :style="s.colDesc">{{ booking.nightCount }} {{ booking.nightCount === 1 ? 'night' : 'nights' }} × K{{ Number(r.rate.toFixed(0)).toLocaleString() }} ({{ r.name }})</Text>
          <Text :style="s.colAmt">{{ fmt(r.total) }}</Text>
        </View>
      </template>
      <!-- Final fallback: single combined row -->
      <template v-else>
        <View :style="s.costRow">
          <Text :style="s.colDesc">{{ booking.nightCount }} {{ booking.nightCount === 1 ? 'night' : 'nights' }} × K{{ Number((booking.baseRatePerNight ?? 0).toFixed(0)).toLocaleString() }} ({{ booking.roomType }})</Text>
          <Text :style="s.colAmt">{{ fmt(booking.baseTotal) }}</Text>
        </View>
      </template>
      <!-- Meal cost + VAT -->
      <View v-if="booking.mealCost > 0" :style="s.costRow">
        <Text :style="s.colDesc">{{ booking.mealPlanName }}</Text>
        <Text :style="s.colAmt">{{ fmt(booking.mealCost) }}</Text>
      </View>
      <View :style="booking.mealCost > 0 ? s.costRowAlt : s.costRow">
        <Text :style="s.colDesc">VAT (16%)</Text>
        <Text :style="s.colAmt">{{ fmt(booking.taxes) }}</Text>
      </View>

      <!-- Totals -->
      <View :style="s.totals">
        <View :style="s.subBlock">
          <View :style="s.totalRow">
            <Text :style="s.totalLabel">Subtotal</Text>
            <Text :style="s.totalBold">{{ fmt((booking.baseTotal ?? 0) + (booking.mealCost ?? 0)) }}</Text>
          </View>
          <View :style="s.totalRow">
            <Text :style="s.totalLabel">VAT (16%)</Text>
            <Text :style="s.totalValue">{{ fmt(booking.taxes) }}</Text>
          </View>
        </View>
        <View :style="s.grandBlock">
          <Text :style="s.grandLabel">Total Payable</Text>
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
        <Text :style="s.footerText">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
        <Text :style="s.footerText">Thank you for choosing Mwakwanda.</Text>
      </View>

    </Page>
  </Document>
</template>
