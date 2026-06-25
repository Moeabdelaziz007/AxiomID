# ۞ مواصفة تصميم حلول التخزين المؤقت والتكرارات | DESIGN SPECIFICATION: CACHING & DUPLICATIONS

هذه المواصفة الفنية تُعالج مشكلة احتجاز الواجهة القديمة (التي تتطلب إعادة تحميل قسري Ctrl+Cmd+R) وتُنظف التكرارات البرمجية في الهوية الرقمية لـ AxiomID.

## سياق المشكلة والحلول المقترحة

### 1. مشكلة التخزين المؤقت (Service Worker Cache Lock)
* **المشكلة:** يعتمد ملف `public/sw.js` استراتيجية Cache-First لكافة طلبات GET التابعة لنفس النطاق. يؤدي هذا لتقديم الصفحة الرئيسية `/` وقطع كود Next.js من الذاكرة المخبأة دائماً، مانعاً المتصفح من جلب التحديثات الجديدة تلقائياً عند نشر إصدارات جديدة على Vercel.
* **الحل:** إعادة هيكلة `sw.js` لاستخدام استراتيجية **Network-First** لطلبات المستندات وطلبات الصفحات، واستراتيجية **Stale-While-Revalidate** للملفات الساكنة الأخرى كالأيقونات والخطوط، مع استثناء طلبات API كلياً من التخزين المؤقت.

### 2. التكرارات داخل التطبيق الأساسي (`src/`)
* **PiBrowserGuard:** إزالة التصدير الافتراضي `export default PiBrowserGuard;` غير المستخدم نهائياً والاعتماد الحصري على Named Export لتفادي ازدواجية التصدير.
* **PassportSlugParamSchema:** دمج المخطط مع المخطط الأصلي `SlugParamSchema` وتحديث الاستدعاءات المقابلة في مسارات الـ App Router لتبسيط هيكل التحقق من البيانات.
* **math-physics.ts:** محاذاة ودمج الدوال الرياضية والفيزيائية المتقدمة (مثل محاكاة Langevin وتوافق Ising) من نسخة الـ Worker إلى التطبيق الأساسي لتوحيد المكتبات الرياضية وتسهيل أي عمليات حسابية متطورة على الواجهة مستقبلاً، مع الاحتفاظ بـ `math-physics.ts` كملفين منفصلين جغرافياً لسلامة تجميع Wrangler و Next.js المستقلين.

---

## Proposed Changes

### [Component: Caching & Service Worker]

#### [MODIFY] [sw.js](../../../public/sw.js)
تحديث معالج طلبات الجلب (`fetch` listener) لتطبيق السياسة الجديدة:
* استثناء أي طلبات تبدأ بـ `/api/` أو تحتوي على نهايات غير مدعومة.
* تطبيق استراتيجية **Network-First** للمستندات والطلبات التي تطلب صفحات HTML.
* تطبيق استراتيجية **Stale-While-Revalidate** للأصول الساكنة المعتمدة.

---

### [Component: Codebase Duplications & Cleanups]

#### [MODIFY] [PiBrowserGuard.tsx](../../../src/components/PiBrowserGuard.tsx)
إزالة السطر الأخير `export default PiBrowserGuard;` لتفادي تحذيرات التصدير المزدوج.

#### [MODIFY] [validators.ts](../../../src/lib/validators.ts)
إزالة `PassportSlugParamSchema` و `PassportSlugParamInput` والاكتفاء بـ `SlugParamSchema` و `SlugParamInput`.

#### [MODIFY] [route.ts (publish)](../../../src/app/api/passport/[slug]/publish/route.ts)
تحديث الاستيراد واستخدام `SlugParamSchema` بدلاً من `PassportSlugParamSchema`.

#### [MODIFY] [route.ts (passport)](../../../src/app/api/passport/[slug]/route.ts)
تحديث الاستيراد واستخدام `SlugParamSchema` بدلاً من `PassportSlugParamSchema`.

#### [MODIFY] [route.ts (verify)](../../../src/app/api/passport/[slug]/verify/route.ts)
تحديث الاستيراد واستخدام `SlugParamSchema` بدلاً من `PassportSlugParamSchema`.

#### [MODIFY] [math-physics.ts](../../../src/lib/math-physics.ts)
إدراج كافة دوال المحاكاة والتحليل الرياضي المتقدمة المتواجدة بـ `backend/src/lib/math-physics.ts` للحفاظ على التطابق الكامل وحماية حدود التجميع المستقلة.

---

## Verification Plan

### Automated Tests
* تشغيل فحص البناء والأنواع والـ Lint:
  `npm run type-check && npm run lint`
* تشغيل اختبارات الوحدة للتأكد من عدم وجود تراجعات:
  `npm run test`
* تشغيل أداة كشف الأكواد الميتة للتأكد من إزالة تحذيرات التصدير المزدوج:
  `npm run dead-code`

### Manual Verification
* فحص تبويب Application -> Service Workers في أدوات مطوري متصفح Chrome للتأكد من تفعيل خدمة العمال الجديدة بدون أخطاء.
* اختبار عمليات التنقل للتأكد من أن الصفحات تُجلب دائماً من الشبكة أولاً عند توفر اتصال إنترنت، لتفادي تعليق واجهات المستخدم القديمة.
