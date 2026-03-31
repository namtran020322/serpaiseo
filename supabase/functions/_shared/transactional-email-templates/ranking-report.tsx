import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr, Row, Column,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "serpaiseo"

interface RankingReportProps {
  className?: string
  domain?: string
  checkedAt?: string
  totalKeywords?: number
  foundKeywords?: number
  improvedCount?: number
  declinedCount?: number
  topMovers?: Array<{ keyword: string; from: number | null; to: number | null; change: number }>
  classUrl?: string
  isPartial?: boolean
  processedCount?: number
  errorMessage?: string
}

const RankingReportEmail = ({
  className = 'My Class',
  domain = 'example.com',
  checkedAt = '2024-01-15 10:00',
  totalKeywords = 10,
  foundKeywords = 8,
  improvedCount = 3,
  declinedCount = 2,
  topMovers = [],
  classUrl = '#',
  isPartial = false,
  processedCount,
  errorMessage,
}: RankingReportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Ranking report for {domain} — {className}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>📊 Ranking Report</Heading>
        <Text style={subtitle}>{className} • {domain}</Text>
        <Text style={metaText}>Checked at: {checkedAt}</Text>

        {errorMessage ? (
          <Section style={errorBox}>
            <Text style={errorTextStyle}>⚠️ {errorMessage}</Text>
          </Section>
        ) : (
          <>
            {isPartial && (
              <Section style={warningBox}>
                <Text style={warningText}>
                  ⏳ Partial results: {processedCount}/{totalKeywords} keywords processed. 
                  Remaining keywords will be checked in the next cycle.
                </Text>
              </Section>
            )}

            <Section style={statsRow}>
              <Row>
                <Column style={statBox}>
                  <Text style={statNumber}>{totalKeywords}</Text>
                  <Text style={statLabel}>Total</Text>
                </Column>
                <Column style={statBox}>
                  <Text style={statNumber}>{foundKeywords}</Text>
                  <Text style={statLabel}>Found</Text>
                </Column>
                <Column style={{ ...statBox, color: '#16a34a' }}>
                  <Text style={{ ...statNumber, color: '#16a34a' }}>▲ {improvedCount}</Text>
                  <Text style={statLabel}>Improved</Text>
                </Column>
                <Column style={{ ...statBox, color: '#dc2626' }}>
                  <Text style={{ ...statNumber, color: '#dc2626' }}>▼ {declinedCount}</Text>
                  <Text style={statLabel}>Declined</Text>
                </Column>
              </Row>
            </Section>

            {topMovers && topMovers.length > 0 && (
              <>
                <Hr style={hr} />
                <Heading style={h2}>Top Movers</Heading>
                {topMovers.map((m, i) => (
                  <Section key={i} style={moverRow}>
                    <Text style={moverKeyword}>{m.keyword}</Text>
                    <Text style={moverChange}>
                      {m.from ?? '—'} → {m.to ?? '—'}{' '}
                      <span style={m.change < 0 ? moverUp : moverDown}>
                        ({m.change < 0 ? `▲${Math.abs(m.change)}` : `▼${m.change}`})
                      </span>
                    </Text>
                  </Section>
                ))}
              </>
            )}
          </>
        )}

        <Hr style={hr} />
        <Button style={button} href={classUrl}>
          View Full Report
        </Button>

        <Text style={footer}>
          This is an automated ranking report from {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RankingReportEmail,
  subject: (data: Record<string, any>) => `Ranking Report: ${data.className || 'Your Class'} — ${data.domain || 'your domain'}`,
  displayName: 'Ranking Report',
  previewData: {
    className: 'SEO Campaign',
    domain: 'example.com',
    checkedAt: '2024-01-15 10:00',
    totalKeywords: 10,
    foundKeywords: 8,
    improvedCount: 3,
    declinedCount: 2,
    topMovers: [
      { keyword: 'best laptop 2024', from: 15, to: 8, change: -7 },
      { keyword: 'macbook pro review', from: 5, to: 3, change: -2 },
      { keyword: 'gaming laptop', from: 10, to: 18, change: 8 },
    ],
    classUrl: 'https://serpaiseo.lovable.app/dashboard/projects/123/classes/456',
  },
} satisfies TemplateEntry

// Styles
const main = { backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { padding: '24px 32px', maxWidth: '580px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: '700' as const, color: '#1a1a2e', margin: '0 0 8px' }
const h2 = { fontSize: '18px', fontWeight: '600' as const, color: '#1a1a2e', margin: '16px 0 12px' }
const subtitle = { fontSize: '16px', color: '#3b82f6', fontWeight: '600' as const, margin: '0 0 4px' }
const metaText = { fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }
const statsRow = { margin: '0 0 8px' }
const statBox = { textAlign: 'center' as const, padding: '12px 8px' }
const statNumber = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1a2e', margin: '0' }
const statLabel = { fontSize: '12px', color: '#6b7280', margin: '4px 0 0', textTransform: 'uppercase' as const }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
const moverRow = { padding: '6px 0', borderBottom: '1px solid #f3f4f6' }
const moverKeyword = { fontSize: '14px', color: '#1a1a2e', fontWeight: '500' as const, margin: '0 0 2px' }
const moverChange = { fontSize: '13px', color: '#6b7280', margin: '0' }
const moverUp = { color: '#16a34a', fontWeight: '600' as const }
const moverDown = { color: '#dc2626', fontWeight: '600' as const }
const button = {
  backgroundColor: '#3b82f6', color: '#ffffff', padding: '12px 24px',
  borderRadius: '6px', fontSize: '14px', fontWeight: '600' as const,
  textDecoration: 'none', display: 'inline-block' as const, margin: '8px 0',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '24px 0 0' }
const errorBox = { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 16px', margin: '12px 0' }
const errorTextStyle = { fontSize: '14px', color: '#dc2626', margin: '0' }
const warningBox = { backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px 16px', margin: '12px 0' }
const warningText = { fontSize: '13px', color: '#92400e', margin: '0' }
