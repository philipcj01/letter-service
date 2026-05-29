import { StyleSheet } from '@react-pdf/renderer';

// A4 page dimensions in points (1mm = 2.835pt)
export const PAGE_HEIGHT_A4 = 841.89;
export const PAGE_WIDTH_A4 = 595.28;
export const PAGE_HEIGHT_LETTER = 792;

// Danish envelope window positioning (DS 13:2000)
// Window: 45mm from top, 20mm from left, 90×35mm
const MM = 2.835;
export const ENVELOPE_WINDOW = {
  top: 45 * MM,       // ~127.5pt
  left: 20 * MM,      // ~56.7pt
  width: 90 * MM,     // ~255pt
  height: 35 * MM,    // ~99pt
};

// Layout measurements
const HEADER_TOP = 20;           // pt from page edge
const HEADER_HEIGHT = 30;        // pt for logo + date row
const PAGE_MARGIN_H = 56.7;     // ~20mm horizontal margins (matches envelope left)
const HEADER_CLEARANCE = 60;    // paddingTop for all pages (clears header + separator)
const FOOTER_HEIGHT = 40;

// Space needed on page 1 before content (to clear address block)
// = distance from top of content area to where body text should start
export const PAGE1_CONTENT_OFFSET = 105 * MM - HEADER_CLEARANCE; // ~238pt spacer on page 1

export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: HEADER_CLEARANCE,
    paddingBottom: FOOTER_HEIGHT + 20,
    paddingHorizontal: PAGE_MARGIN_H,
    lineHeight: 1.5,
  },
  h1: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 4,
    fontFamily: 'Helvetica-Bold',
  },
  h2: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 10,
    fontFamily: 'Helvetica-Bold',
  },
  h3: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    marginTop: 8,
    fontFamily: 'Helvetica-Bold',
  },
  h4: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  paragraph: {
    fontSize: 10,
    marginBottom: 8,
    lineHeight: 1.5,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  italic: {
    fontFamily: 'Helvetica-Oblique',
  },
  bulletItem: {
    fontSize: 10,
    marginBottom: 3,
    lineHeight: 1.5,
    paddingLeft: 15,
  },
});

export const tableStyles = StyleSheet.create({
  table: {
    width: '100%',
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderBottomStyle: 'solid',
    minHeight: 24,
    alignItems: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#333333',
    borderBottomStyle: 'solid',
    minHeight: 28,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
});

export const layoutStyles = StyleSheet.create({
  header: {
    position: 'absolute',
    top: HEADER_TOP,
    left: PAGE_MARGIN_H,
    right: PAGE_MARGIN_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerDate: {
    fontSize: 10,
    color: '#333333',
  },
  separator: {
    position: 'absolute',
    top: HEADER_TOP + HEADER_HEIGHT + 5,
    left: PAGE_MARGIN_H,
    right: PAGE_MARGIN_H,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cccccc',
    borderBottomStyle: 'solid',
  },
  addressBlock: {
    position: 'absolute',
    top: ENVELOPE_WINDOW.top,
    left: ENVELOPE_WINDOW.left,
    width: ENVELOPE_WINDOW.width,
    height: ENVELOPE_WINDOW.height,
    justifyContent: 'center',
  },
  logo: {
    width: 80,
    height: 'auto',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: PAGE_MARGIN_H,
    right: PAGE_MARGIN_H,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    borderTopStyle: 'solid',
    fontSize: 8,
    color: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  pageNumber: {
    fontSize: 8,
    color: '#333333',
  },
});
