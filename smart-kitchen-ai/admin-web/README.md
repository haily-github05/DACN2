# Bếp Thông Minh — Admin Web

Trang quản trị sử dụng React, TypeScript và Vite; kết nối MySQL thông qua backend.

## Chạy ứng dụng

Chạy backend trước, sau đó mở terminal khác tại `admin-web`:

```sh
cd admin-web
npm install
npm run dev
```

Đăng nhập bằng email hoặc số điện thoại và mật khẩu của tài khoản có quyền `ADMIN`.

## Cấu hình API

Mặc định chuyển tiếp `/api` và `/uploads` tới `http://127.0.0.1:3000`.
Nếu backend dùng địa chỉ khác, tạo `.env.local`:

```env
VITE_API_URL=http://localhost:3000
```

Khởi động lại Vite sau khi đổi cấu hình.

## Kiểm tra và build

```sh
npm run lint
npm run typecheck
npm run build
```

Kết quả build nằm trong `dist/`.
