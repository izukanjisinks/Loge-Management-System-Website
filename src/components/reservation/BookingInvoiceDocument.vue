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

  metaRow:    { flexDirection: 'row', marginBottom: 24, gap: 16 },
  metaBox:    { flex: 1, backgroundColor: '#fff1ea', padding: 12, borderRadius: 4 },
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
  <Document title="Booking Invoice">
    <Page size="A4" :style="s.page">

      <!-- Header -->
      <View :style="s.header">
        <View>
          <Text :style="s.brandName">{{ booking.lodgeName || 'Mwakwanda' }}</Text>
          <Text :style="s.brandSub">Hospitality &amp; Accommodation</Text>
        </View>
        <View>
          <Text :style="s.docTitle">BOOKING INVOICE</Text>
          <Text :style="s.docSub">Generated {{ fmtDate(new Date().toISOString()) }}</Text>
          <View :style="s.badge">
            <Text :style="s.badgeText">{{ isCorporate ? 'CORPORATE' : 'INDIVIDUAL' }}</Text>
          </View>
        </View>
      </View>

      <!-- Bill To + Stay Info -->
      <View :style="s.metaRow">
        <View :style="s.metaBox">
          <Text :style="s.metaLabel">{{ isCorporate ? 'Company' : 'Guest' }}</Text>
          <Text :style="s.metaValue">
            {{ isCorporate ? booking.corporateClient.companyName : `${booking.guestInfo.firstName} ${booking.guestInfo.lastName}` }}
          </Text>
          <Text :style="s.metaSmall">
            {{ isCorporate ? `HOD: ${booking.corporateClient.contactPerson}` : booking.guestInfo.email }}
          </Text>
          <Text :style="s.metaSmall">
            {{ isCorporate ? `Reg: ${booking.corporateClient.regNumber}` : booking.guestInfo.phone }}
          </Text>
          <Text :style="s.metaSmall">{{ isCorporate ? booking.corporateClient.email : ' ' }}</Text>
          <Text :style="s.metaSmall">{{ isCorporate ? booking.corporateClient.phone : ' ' }}</Text>
        </View>
        <View :style="s.metaBox">
          <Text :style="s.metaLabel">Stay Details</Text>
          <Text :style="s.metaValue">{{ booking.roomType || 'Room' }}</Text>
          <Text :style="s.metaSmall">Check-in: {{ fmtDate(booking.checkIn) }}</Text>
          <Text :style="s.metaSmall">Check-out: {{ fmtDate(booking.checkOut) }}</Text>
          <Text :style="s.metaSmall">Duration: {{ booking.nightCount }} {{ booking.nightCount === 1 ? 'night' : 'nights' }}</Text>
          <Text :style="s.metaSmall">{{ !isCorporate ? `Guests: ${booking.guestCount} ${booking.guestCount === 1 ? 'Adult' : 'Adults'}` : ' ' }}</Text>
        </View>
      </View>

      <!-- Employee list (corporate only) -->
      <template v-if="isCorporate && booking.corporateGuests.length">
        <Text :style="s.sectionTitle">Employee Guests</Text>
        <View :style="s.tableHeader">
          <Text :style="[s.thText, s.colName]">Full Name</Text>
          <Text :style="[s.thText, s.colId]">ID / Passport</Text>
          <Text :style="[s.thText, s.colEmail]">Email</Text>
        </View>
        <View
          v-for="(g, i) in booking.corporateGuests"
          :key="i"
          :style="i % 2 === 0 ? s.tableRow : s.tableRowAlt"
        >
          <Text :style="s.colName">{{ g.fullName || '—' }}</Text>
          <Text :style="s.colId">{{ g.idNumber || '—' }}</Text>
          <Text :style="s.colEmail">{{ g.email || '—' }}</Text>
        </View>
      </template>

      <!-- Cost breakdown -->
      <Text :style="s.sectionTitle">Cost Breakdown</Text>
      <View :style="s.costHeader">
        <Text :style="[s.thText, s.colDesc]">Description</Text>
        <Text :style="[s.thText, s.colAmt]">Amount</Text>
      </View>
      <View :style="s.costRow">
        <Text :style="s.colDesc">{{ booking.nightCount }} nights × K{{ Number((booking.baseRatePerNight ?? 0).toFixed(0)).toLocaleString() }} ({{ booking.roomType }})</Text>
        <Text :style="s.colAmt">{{ fmt(booking.baseTotal) }}</Text>
      </View>
      <View v-if="booking.mealCost > 0" :style="s.costRowAlt">
        <Text :style="s.colDesc">{{ booking.mealPlanName }}</Text>
        <Text :style="s.colAmt">{{ fmt(booking.mealCost) }}</Text>
      </View>
      <View :style="booking.mealCost > 0 ? s.costRow : s.costRowAlt">
        <Text :style="s.colDesc">Conservation Levy (12%)</Text>
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
            <Text :style="s.totalLabel">Taxes (12%)</Text>
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
