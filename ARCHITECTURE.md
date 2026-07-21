# Smart Quotation & CRM Architecture
เอกสารนี้อธิบายสถาปัตยกรรมระบบและโครงสร้างฐานข้อมูลของแอปพลิเคชันจัดการใบเสนอราคาและสต็อกสินค้า

## 1. System Architecture (สถาปัตยกรรมระบบ)

ระบบนี้ใช้รูปแบบสถาปัตยกรรม **Serverless API + React Frontend** โดยมีองค์ประกอบดังนี้:

```mermaid
graph TD
    Client[React + Vite Frontend\n(UI, State, Context)]
    API[n8n Webhooks\n(API Gateway & Logic)]
    DB[(Google Sheets / Database\nMaster Data)]
    AI[AI Provider\n(OpenAI/Gemini)]

    Client <-->|HTTP GET/POST| API
    API <-->|Read/Write| DB
    API <-->|Prompt/Response| AI
```

*   **Frontend (Client):** จัดการ UI และตรวจสอบสิทธิ์แบบเบื้องต้น (ย้ายการจัดการ State มาไว้ที่ `DataContext` เพื่อลดการยิง API ซ้ำซ้อน)
*   **Backend (API):** ใช้ n8n รับ Webhook ทำหน้าที่เสมือน Backend เพื่อส่งต่อข้อมูลไปยัง Database และ AI
*   **Database:** เก็บข้อมูล Master Data ทั้งหมด (ปัจจุบันใช้ Google Sheets เป็น Database หลัก)

---

## 2. Database Schema (โครงสร้างฐานข้อมูล)

เพื่อให้ระบบขยายสเกลได้และข้อมูลไม่ซ้ำซ้อน ฐานข้อมูลควรถูกแบ่งออกเป็น 5 ตารางหลัก (Normalization) ดังนี้:

### Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    EMPLOYEES ||--o{ CUSTOMERS : "ดูแล"
    EMPLOYEES ||--o{ QUOTATIONS : "สร้าง"
    CUSTOMERS ||--o{ QUOTATIONS : "เป็นเจ้าของ"
    QUOTATIONS ||--|{ QUOTATION_ITEMS : "มี"
    PRODUCTS ||--o{ QUOTATION_ITEMS : "ถูกเลือก"

    EMPLOYEES {
        string employee_id PK "รหัสพนักงาน (PIC)"
        string name "ชื่อ-นามสกุล"
        string role "สิทธิ์ (admin, sale, stock)"
        string password "รหัสผ่าน (Hash)"
    }

    CUSTOMERS {
        string customer_id PK "รหัสลูกค้า"
        string company_name "ชื่อบริษัท"
        string tax_id "เลขผู้เสียภาษี"
        string address "ที่อยู่"
        string phone "เบอร์โทร"
        string pic_id FK "รหัสพนักงานที่ดูแล (อ้างอิง EMPLOYEES)"
    }

    PRODUCTS {
        string product_id PK "รหัสสินค้า"
        string name "ชื่อสินค้า"
        string unit "หน่วย (เช่น ชิ้น, กล่อง)"
        float unit_price "ราคาต่อหน่วย"
        int stock_quantity "จำนวนคงเหลือในสต็อก"
    }

    QUOTATIONS {
        string quotation_no PK "เลขที่ใบเสนอราคา (เช่น QT-2024-001)"
        string customer_id FK "รหัสลูกค้า (อ้างอิง CUSTOMERS)"
        string employee_id FK "รหัสพนักงาน (อ้างอิง EMPLOYEES)"
        date issue_date "วันที่ออกเอกสาร"
        float subtotal "ยอดก่อนภาษี"
        float vat "ภาษีมูลค่าเพิ่ม 7%"
        float total "ยอดสุทธิ"
        string status "สถานะ (Draft, Sent, Approved, Rejected)"
    }

    QUOTATION_ITEMS {
        string item_id PK "รหัสรายการ"
        string quotation_no FK "เลขที่ใบเสนอราคา (อ้างอิง QUOTATIONS)"
        string product_id FK "รหัสสินค้า (อ้างอิง PRODUCTS)"
        int quantity "จำนวนที่เสนอขาย"
        float unit_price "ราคาที่เสนอ (อาจให้ส่วนลดจากราคาปกติ)"
        float total_price "ราคารวมของรายการนี้"
    }
```

---

## 3. Development Phases (แผนการพัฒนา)

### Phase 1: Foundation & Security (สถานะ: กำลังปรับปรุง)
- [x] สร้าง UI หน้าจอพื้นฐาน (React)
- [x] เชื่อมต่อ n8n เบื้องต้น
- [x] **Refactoring (เพิ่งทำ):** จัดการ Global State ด้วย `DataContext` เพื่อลด API Request (แก้ไขปัญหา N+1 Query)
- [ ] **Pending:** ปรับปรุงระบบ Authentication ให้ปลอดภัย โดยให้ n8n เป็นคน Validate ข้อมูล ไม่ใช่เช็คที่ฝั่ง Client

### Phase 2: Master Data Management (CRUD)
- [ ] พัฒนาระบบเพิ่ม/ลบ/แก้ไข (Database Manager) ให้รองรับโครงสร้างตาราง Customers และ Products
- [ ] จัดการระบบ Stock Manager ให้อัปเดตข้อมูล `stock_quantity` ได้จริง

### Phase 3: Transaction & Logic
- [ ] ปรับปรุงหน้า `QuotationMaker` ให้เวลาบันทึก (Save) มีการบันทึกลง 2 ตาราง คือ `QUOTATIONS` (หัวบิล) และ `QUOTATION_ITEMS` (หางบิล)
- [ ] เมื่อใบเสนอราคาถูกเปลี่ยนสถานะเป็น Approved ให้ทำการหักยอด `stock_quantity` อัตโนมัติ

### Phase 4: Analytics
- [ ] สร้าง Dashboard ดึงข้อมูลจาก `QUOTATIONS` เพื่อสรุปยอดขายรายเดือน
