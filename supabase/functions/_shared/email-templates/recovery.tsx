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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="vi" dir="ltr">
    <Head />
    <Preview>Đặt lại mật khẩu cho {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://hzcrlucfyxqxsadbvazi.supabase.co/storage/v1/object/public/email-assets/logo.webp"
          alt="SerpAISEO"
          height="40"
          style={{ marginBottom: '24px' }}
        />
        <Heading style={h1}>Đặt lại mật khẩu</Heading>
        <Text style={text}>
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản {siteName} của bạn. Nhấn nút bên dưới để chọn mật khẩu mới.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Đặt lại mật khẩu
        </Button>
        <Text style={footer}>
          Nếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này. Mật khẩu của bạn sẽ không thay đổi.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
