---
name: vnpay-integration
description: Tích hợp cổng thanh toán VNPay vào ứng dụng Node.js/TypeScript. Dùng khi cần tạo URL thanh toán, xác thực callback, hoặc tích hợp VNPay vào backend. Triggers: "vnpay", "thanh toán vnpay", "tích hợp vnpay", "vnpay payment", "cổng thanh toán", "payment gateway vietnam", "vnpay callback", "vnpay return url", "nestjs-vnpay"
source: github.com/lehuygiang28/vnpay
license: MIT
---

# VNPay Integration

Thư viện Node.js hiện đại cho tích hợp cổng thanh toán VNPay. TypeScript-first, tree-shaking, modular imports.

Source: [lehuygiang28/vnpay](https://github.com/lehuygiang28/vnpay) · Docs: [vnpay.js.org](https://vnpay.js.org/)

## When to Use

- Tạo URL thanh toán VNPay từ backend Node.js
- Xác thực callback / return URL từ VNPay
- Tích hợp VNPay vào NestJS (dùng `nestjs-vnpay`)
- Query trạng thái giao dịch (IPN handling)

**Quan trọng:** Thư viện này chỉ dùng trên backend (Node.js) — không dùng trực tiếp trong React/Vue/Angular vì sử dụng `fs`, `crypto`.

## Install

```bash
npm install vnpay
# NestJS
npm install nestjs-vnpay
```

## Quick Start

```typescript
import { VNPay, HashAlgorithm, ProductCode } from 'vnpay';

const vnpay = new VNPay({
  tmnCode: process.env.VNPAY_TMN_CODE,
  secureSecret: process.env.VNPAY_SECURE_SECRET,
  vnpayHost: 'https://sandbox.vnpayment.vn',
  testMode: true, // bỏ khi production
  hashAlgorithm: HashAlgorithm.SHA512,
});

// Tạo URL thanh toán
const paymentUrl = vnpay.buildPaymentUrl({
  vnp_Amount: 100000,       // VND — nhân 100 tự động
  vnp_IpAddr: '127.0.0.1',
  vnp_TxnRef: 'ORDER-001',
  vnp_OrderInfo: 'Thanh toan don hang ORDER-001',
  vnp_OrderType: ProductCode.Other,
  vnp_ReturnUrl: 'https://yourdomain.com/payment/return',
  vnp_Locale: VnpLocale.VN,
});

// Redirect user đến paymentUrl
```

## Xác thực Return URL

```typescript
// Trong route handler /payment/return
const verify = vnpay.verifyReturnUrl(req.query);

if (verify.isSuccess) {
  // Giao dịch thành công
  console.log('TxnRef:', verify.vnp_TxnRef);
  console.log('Amount:', verify.vnp_Amount);
} else {
  // Thất bại hoặc bị tamper
  console.log('Error:', verify.message);
}
```

## NestJS Integration

```typescript
// app.module.ts
import { VNPayModule } from 'nestjs-vnpay';

@Module({
  imports: [
    VNPayModule.forRoot({
      tmnCode: process.env.VNPAY_TMN_CODE,
      secureSecret: process.env.VNPAY_SECURE_SECRET,
      testMode: process.env.NODE_ENV !== 'production',
    }),
  ],
})
export class AppModule {}

// payment.service.ts
@Injectable()
export class PaymentService {
  constructor(private readonly vnpay: VNPayService) {}

  createPaymentUrl(orderId: string, amount: number, ip: string) {
    return this.vnpay.buildPaymentUrl({
      vnp_Amount: amount,
      vnp_IpAddr: ip,
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
      vnp_ReturnUrl: `${process.env.APP_URL}/payment/return`,
    });
  }
}
```

## Sandbox Testing

```
TMN Code:   DEMOV210
Secret:     RAOEXHYVSDDIIENYWSLDIIZTANXUXZFJ
Host:       https://sandbox.vnpayment.vn
Test card:  9704198526191432198 (ATM nội địa)
```

## Modular Import (v2.4.0+)

```typescript
// Import theo module — giảm bundle size 80%
import { VNPay } from 'vnpay/vnpay';
import { HashAlgorithm, ProductCode } from 'vnpay/enums';
import type { VNPayConfig, BuildPaymentUrl } from 'vnpay/types-only'; // 0KB runtime
```

## Security Checklist

- [ ] `secureSecret` chỉ nằm trong env, không hardcode
- [ ] Luôn xác thực chữ ký (`verifyReturnUrl`) trước khi cập nhật DB
- [ ] Dùng HTTPS cho `vnp_ReturnUrl`
- [ ] Log IPN để audit giao dịch
- [ ] Không expose TMN Code phía frontend

## Do NOT use for

- Frontend payment UI — dùng API route của backend, không import trực tiếp
- Non-VNPay gateways — xem skill `stripe-payments` hoặc `momo-integration`
