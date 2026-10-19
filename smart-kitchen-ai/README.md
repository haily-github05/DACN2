# Smart Kitchen AI – Bếp thông minh

Ứng dụng hỗ trợ quản lý nguyên liệu trong bếp, theo dõi hạn sử dụng, tìm kiếm công thức, lên thực đơn và lập danh sách mua sắm. Dự án gồm ứng dụng **Mobile (React Native + Expo)** và (nếu có trong nhánh đã tải) **Admin Web (React + Vite)**.

> **Lưu ý:** Một số tính năng hiện là giao diện/prototype với dữ liệu mẫu, chưa kết nối AI hoặc backend thật. Các màn hình dùng AsyncStorage có thể lưu dữ liệu cục bộ trên thiết bị.

## 1. Yêu cầu trước khi chạy

- Máy tính macOS hoặc Windows, đã cài **Node.js LTS** và npm.
- Git (hoặc tải ZIP trực tiếp từ GitHub).
- VS Code (khuyến nghị).
- **iPhone:** cài ứng dụng Expo Go từ App Store; điện thoại và máy tính nên kết nối cùng mạng Wi-Fi.
- **Chạy web:** dùng trình duyệt Chrome hoặc Safari. Nếu thiếu gói web, xem bước cài đặt bên dưới.

Kiểm tra công cụ bằng Terminal:

```bash
node -v
npm -v
git --version
```

## 2. Tải mã nguồn từ GitHub

**Cách 1 – Dùng Git (khuyến nghị):**

```bash
git clone https://github.com/haily-github05/DACN2.git
cd DACN2
```

**Cách 2 – Tải ZIP:**

1. Mở https://github.com/haily-github05/DACN2
2. Chọn **Code → Download ZIP**.
3. Giải nén tệp ZIP và mở thư mục dự án trong VS Code.

## 3. Chạy ứng dụng Mobile (Expo)

Từ thư mục gốc repository, mở Terminal:

```bash
cd smart-kitchen-ai/mobile
npm install
npx expo start -c
```

> Nếu thư mục vừa tải không có đường dẫn `smart-kitchen-ai/mobile`, hãy tìm thư mục chứa `package.json` của ứng dụng Expo và chạy lệnh trong thư mục đó.

Sau khi Expo khởi động, Terminal hiển thị mã QR và các phím tắt.

### Chạy trên iPhone

1. Cài và mở **Expo Go** trên iPhone.
2. Kết nối iPhone và Mac cùng Wi-Fi.
3. Quét mã QR trong Terminal bằng Camera của iPhone hoặc từ Expo Go.
4. Chờ ứng dụng tải xong.

Nếu không kết nối được qua Wi-Fi, thử:

```bash
npx expo start --tunnel
```

### Chạy trên trình duyệt web (Mac)

Trong Terminal đang chạy Expo, nhấn **w** để mở trình duyệt. Hoặc chạy:

```bash
npx expo start --web
```

Nếu báo thiếu `react-native-web` / `react-dom`, chạy trong thư mục `mobile`:

```bash
npx expo install react-native-web react-dom @expo/metro-runtime
npx expo start -c --web
```

**Lưu ý:** Một số chức năng thiết bị như camera, thông báo hoặc thư viện native có thể hoạt động khác trên web so với iPhone.

## 4. Chạy Admin Web (nếu có)

Nếu mã nguồn có thư mục `smart-kitchen-ai/admin-web` (hoặc `admin-web`), mở Terminal mới và chuyển đến đúng thư mục chứa `package.json` của Admin Web:

```bash
cd smart-kitchen-ai/admin-web
npm install
npm run dev
```

Mở địa chỉ `Local` do Vite hiển thị, thường là `http://localhost:5173/`. Không cần chạy Admin Web để sử dụng ứng dụng Mobile.

## 5. Cấu trúc thư mục tham khảo

```text
DACN2/
└── smart-kitchen-ai/
    ├── mobile/
    │   ├── app/              # Các màn hình và định tuyến Expo Router
    │   ├── components/       # Header, BottomNav, trợ lý AI...
    │   ├── lib/              # Tiện ích / xử lý dữ liệu (nếu có)
    │   └── package.json
    └── admin-web/            # Trang quản trị React + Vite (nếu có)
```

## 6. Một số chức năng của ứng dụng

- **Trang chủ:** tổng quan nguyên liệu, truy cập nhanh các tính năng.
- **Kho thực phẩm:** danh sách, thêm, xem chi tiết và chỉnh sửa nguyên liệu.
- **Khám phá:** tìm công thức và xem chi tiết món ăn.
- **Thực đơn:** lên kế hoạch bữa ăn.
- **Danh sách mua sắm:** thêm và đánh dấu nguyên liệu cần mua.
- **Trợ lý AI:** giao diện hội thoại hỗ trợ gợi ý món ăn và lên thực đơn; phản hồi có thể đang dùng logic mẫu.

## 7. Xử lý lỗi thường gặp

**Lỗi `Unable to resolve react-native-web/dist/index`:**

```bash
cd smart-kitchen-ai/mobile
npx expo install react-native-web react-dom @expo/metro-runtime
npx expo start -c --web
```

**Lỗi `Cannot find module` / thiếu thư viện:**

```bash
npm install
npx expo start -c
```

**Expo Go không mở được hoặc lỗi kết nối:**

- Kiểm tra Mac và iPhone cùng Wi-Fi.
- Tắt VPN nếu đang dùng.
- Thử `npx expo start --tunnel`.
- Kiểm tra phiên bản Expo Go tương thích với Expo SDK trong `package.json`.

**Cổng đang bị chiếm:**

- Đồng ý khi Expo/Vite đề nghị dùng cổng khác; hoặc dừng tiến trình cũ bằng `Ctrl + C`.

**Không tìm thấy nguyên liệu khi chỉnh sửa:**

- Kiểm tra màn hình Chi tiết có truyền đúng `id` sang màn hình Chỉnh sửa.
- Đảm bảo Kho thực phẩm, Chi tiết và Chỉnh sửa cùng sử dụng một nguồn dữ liệu/khóa AsyncStorage.

## 8. Cập nhật code mới từ GitHub

Nếu đã clone bằng Git:

```bash
git pull origin main
cd smart-kitchen-ai/mobile
npm install
npx expo start -c
```

> Nếu repository sử dụng nhánh khác `main`, thay bằng tên nhánh thực tế. Trước khi `git pull`, lưu hoặc commit thay đổi cục bộ để tránh xung đột.

## 9. Ghi chú

- Chạy lệnh `npm install` và `npx expo start` **trong thư mục Mobile có `package.json`**, không chạy tùy ý ở thư mục gốc.
- Không đưa file `.env`, mật khẩu, khóa API hoặc `node_modules` lên GitHub.
- Các tính năng phụ thuộc API/backend chỉ hoạt động khi dịch vụ tương ứng đã được cấu hình và khởi động.

---

**Repository:** https://github.com/haily-github05/DACN2
