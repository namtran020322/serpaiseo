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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="vi" dir="ltr">
    <Head />
    <Preview>Xác nhận thay đổi email cho {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://hzcrlucfyxqxsadbvazi.supabase.co/storage/v1/object/public/email-assets/logo.webp"
          alt="SerpAISEO"
          height="40"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Xác nhận thay đổi email</Heading>
        <Text style={text}>
          Bạn đã yêu cầu thay đổi email cho {siteName} từ{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          sang{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Nhấn nút bên dưới để xác nhận thay đổi:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Xác nhận thay đổi Email
        </Button>
        <Text style={footer}>
          Nếu bạn không yêu cầu thay đổi này, vui lòng bảo mật tài khoản ngay lập tức.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
