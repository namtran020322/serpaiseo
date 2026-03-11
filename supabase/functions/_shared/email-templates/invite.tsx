/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="vi" dir="ltr">
    <Head />
    <Preview>Bạn được mời tham gia {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://hzcrlucfyxqxsadbvazi.supabase.co/storage/v1/object/public/email-assets/logo.webp"
          alt="SerpAISEO"
          height="40"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Bạn được mời tham gia</Heading>
        <Text style={text}>
          Bạn được mời tham gia{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Nhấn nút bên dưới để chấp nhận lời mời và tạo tài khoản.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Chấp nhận lời mời
        </Button>
        <Text style={footer}>
          Nếu bạn không mong đợi lời mời này, bạn có thể bỏ qua email này.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const link = { color: '#3b82f6', textDecoration: 'underline' }
const button = {
  backgroundColor: '#3b82f6',
  color: '#f8fafc',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#94a3b8', margin: '30px 0 0' }
