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
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function fmtTime(t) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
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
  metaLabel:  { fontSize: 8, color: '#86736b', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold' },
  metaValue:  { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#28180d', marginBottom: 2 },
  metaSmall:  { fontSize: 9, color: '#53433d', marginTop: 2 },

  eventStrip: { flexDirection: 'row', gap: 10, marginBottom: 24, backgroundColor: '#fff1ea', padding: 12, borderRadius: 4 },
  stripItem:  { flex: 1 },

  reasonBox:  { backgroundColor: '#fff8f5', padding: 10, borderRadius: 4, marginBottom: 20, borderLeftWidth: 2, borderLeftColor: '#d8c2b9' },
  reasonLabel: { fontSize: 8, color: '#86736b', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  reasonText:  { fontSize: 9, color: '#53433d' },

  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#86736b', textTransform: 'uppercase', marginBottom: 8, marginTop: 20 },

  costHeader:  { flexDirection: 'row', backgroundColor: '#28180d', padding: 8, borderRadius: 4, marginBottom: 1 },
  thText:      { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' },
  colDesc:     { flex: 1 },
  colAmt:      { width: 100, textAlign: 'right' },

  sessionBlock:    { borderBottomWidth: 1, borderBottomColor: '#ffeade', paddingVertical: 8, paddingHorizontal: 8 },
  sessionNameText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#28180d' },
  sessionMetaRow:  { flexDirection: 'row', gap: 8, marginTop: 2 },
  sessionMeta:     { fontSize: 8, color: '#86736b' },
  sessionLineRow:  { flexDirection: 'row', paddingLeft: 12, paddingTop: 5 },
  sessionLineDesc: { flex: 1, fontSize: 9, color: '#53433d' },
  sessionLineAmt:  { width: 100, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#28180d', textAlign: 'right' },
  sessionTbcAmt:   { width: 100, fontSize: 9, color: '#86736b', textAlign: 'right', fontFamily: 'Helvetica-Oblique' },

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
  <Document title="Event Proforma Invoice">
    <Page size="A4" :style="s.page">

      <!-- Header -->
      <View :style="s.header">
        <View>
          <Text :style="s.brandName">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
          <Text :style="s.brandSub">Events &amp; Conference Facilities</Text>
        </View>
        <View>
          <Text :style="s.docTitle">PROFORMA INVOICE</Text>
          <Text :style="s.docSub">Generated {{ fmtDate(new Date().toISOString().slice(0, 10)) }}</Text>
          <View :style="s.badge">
            <Text :style="s.badgeText">{{ isCorporate ? 'CORPORATE EVENT' : 'INDIVIDUAL EVENT' }}</Text>
          </View>
        </View>
      </View>

      <!-- Corporate: Bill From + Bill To -->
      <template v-if="isCorporate">
        <View :style="s.metaRow">
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill From</Text>
            <Text :style="s.metaValue">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
            <Text :style="s.metaSmall">Events &amp; Conference Facilities</Text>
            <Text v-if="booking.lodgeEmail" :style="s.metaSmall">{{ booking.lodgeEmail }}</Text>
            <Text v-if="booking.lodgePhone" :style="s.metaSmall">{{ booking.lodgePhone }}</Text>
          </View>
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill To</Text>
            <Text :style="s.metaValue">{{ booking.corporateClient?.companyName || '—' }}</Text>
            <Text v-if="booking.corporateClient?.contactPerson" :style="s.metaSmall">Attn: {{ booking.corporateClient.contactPerson }}</Text>
            <Text v-if="booking.corporateClient?.email" :style="s.metaSmall">{{ booking.corporateClient.email }}</Text>
            <Text v-if="booking.corporateClient?.phone" :style="s.metaSmall">{{ booking.corporateClient.phone }}</Text>
            <Text v-if="booking.corporateClient?.tpin" :style="s.metaSmall">TPIN: {{ booking.corporateClient.tpin }}</Text>
            <Text v-if="booking.corporateClient?.costCenter" :style="s.metaSmall">
              {{ booking.corporateClient.costCenterType === 'internal_order' ? 'Internal Order' : 'Cost Centre' }}: {{ booking.corporateClient.costCenter }}
            </Text>
            <Text v-if="booking.corporateClient?.glCode" :style="s.metaSmall">GL Code: {{ booking.corporateClient.glCode }}</Text>
          </View>
        </View>
      </template>

      <!-- Individual: Bill From + Bill To -->
      <template v-else>
        <View :style="s.metaRow">
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill From</Text>
            <Text :style="s.metaValue">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
            <Text :style="s.metaSmall">Events &amp; Conference Facilities</Text>
            <Text v-if="booking.lodgeEmail" :style="s.metaSmall">{{ booking.lodgeEmail }}</Text>
            <Text v-if="booking.lodgePhone" :style="s.metaSmall">{{ booking.lodgePhone }}</Text>
          </View>
          <View :style="s.metaBox">
            <Text :style="s.metaLabel">Bill To</Text>
            <Text :style="s.metaValue">{{ `${booking.guestInfo?.firstName ?? ''} ${booking.guestInfo?.lastName ?? ''}`.trim() || '—' }}</Text>
            <Text v-if="booking.guestInfo?.email" :style="s.metaSmall">{{ booking.guestInfo.email }}</Text>
            <Text v-if="booking.guestInfo?.phone" :style="s.metaSmall">{{ booking.guestInfo.phone }}</Text>
          </View>
        </View>
      </template>

      <!-- Event summary strip -->
      <View :style="s.eventStrip">
        <View :style="s.stripItem">
          <Text :style="s.metaLabel">Start Date</Text>
          <Text :style="s.metaSmall">{{ fmtDate(booking.startDate) }}</Text>
        </View>
        <View :style="s.stripItem">
          <Text :style="s.metaLabel">End Date</Text>
          <Text :style="s.metaSmall">{{ fmtDate(booking.endDate) }}</Text>
        </View>
        <View :style="s.stripItem">
          <Text :style="s.metaLabel">Event Days</Text>
          <Text :style="s.metaSmall">{{ booking.activeDays }} of {{ booking.totalDays }}</Text>
        </View>
        <View :style="s.stripItem">
          <Text :style="s.metaLabel">Sessions</Text>
          <Text :style="s.metaSmall">{{ booking.totalSessions }}</Text>
        </View>
        <View :style="s.stripItem">
          <Text :style="s.metaLabel">{{ isCorporate ? 'Delegates' : 'Attendees' }}</Text>
          <Text :style="s.metaSmall">{{ booking.participantCount }}</Text>
        </View>
      </View>

      <!-- Reason for Booking -->
      <View v-if="booking.reasonForBooking" :style="s.reasonBox">
        <Text :style="s.reasonLabel">Reason for Booking</Text>
        <Text :style="s.reasonText">{{ booking.reasonForBooking }}</Text>
      </View>

      <!-- Cost Breakdown -->
      <Text :style="s.sectionTitle">Cost Breakdown</Text>
      <View :style="s.costHeader">
        <Text :style="[s.thText, s.colDesc]">Session / Venue</Text>
        <Text :style="[s.thText, s.colAmt]">Amount</Text>
      </View>

      <View v-for="(session, si) in booking.sessions" :key="si" :style="s.sessionBlock">
        <Text :style="s.sessionNameText">{{ session.name }}</Text>
        <View :style="s.sessionMetaRow">
          <Text v-if="session.eventType" :style="s.sessionMeta">{{ session.eventType }}</Text>
          <Text v-if="session.setupType" :style="s.sessionMeta"> · {{ session.setupType }}</Text>
          <Text v-if="session.startTime && session.endTime" :style="s.sessionMeta"> · {{ fmtTime(session.startTime) }} – {{ fmtTime(session.endTime) }}</Text>
        </View>
        <View :style="s.sessionLineRow">
          <Text :style="s.sessionLineDesc">
            {{ session.venueName ? session.venueName + (session.rateDesc ? '  ·  ' + session.rateDesc : '') : (session.rateDesc || 'Venue TBC') }}
          </Text>
          <Text v-if="session.cost" :style="s.sessionLineAmt">{{ fmt(session.cost) }}</Text>
          <Text v-else :style="s.sessionTbcAmt">TBC</Text>
        </View>
      </View>

      <!-- VAT + Totals -->
      <View :style="s.totals">
        <View :style="s.subBlock">
          <View :style="s.totalRow">
            <Text :style="s.totalLabel">Subtotal</Text>
            <Text :style="s.totalValue">{{ fmt(booking.baseTotal) }}</Text>
          </View>
          <View :style="s.totalRow">
            <Text :style="s.totalLabel">VAT (16%)</Text>
            <Text :style="s.totalValue">{{ fmt(booking.taxes) }}</Text>
          </View>
        </View>
        <View :style="s.grandBlock">
          <Text :style="s.grandLabel">Est. Grand Total</Text>
          <Text :style="s.grandValue">{{ fmt(booking.grandTotal) }}</Text>
        </View>
      </View>

      <!-- Special Requests -->
      <View v-if="booking.specialRequests" :style="s.notes">
        <Text :style="s.notesLabel">Additional Requests</Text>
        <Text :style="s.notesText">{{ booking.specialRequests }}</Text>
      </View>

      <!-- Footer -->
      <View :style="s.footer">
        <Text :style="s.footerText">{{ booking.lodgeName || 'Mwakwanda' }} · Events &amp; Conference Facilities</Text>
        <Text :style="s.footerText">This is a proforma estimate — not a tax invoice</Text>
      </View>

    </Page>
  </Document>
</template>
