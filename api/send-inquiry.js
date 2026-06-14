const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  console.log("POST /api/send-inquiry received");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const inquiry = req.body || {};
  const products = normalizeProducts(inquiry.products);
  const isRfq = String(inquiry.inquiry_type || "").toLowerCase() === "rfq" || products.length > 0;
  if (isRfq) console.log("RFQ EMAIL TRIGGERED");

  const submittedAt = inquiry.submitted_at || new Date().toLocaleString("en-US", {
    timeZone: "Asia/Shanghai"
  });

  const subject = isRfq ? "[LINFTECH RFQ] New RFQ Center Submission" : "[LINFTECH Inquiry] New Product Inquiry";
  const text = isRfq ? buildRfqTextEmail(inquiry, submittedAt) : buildTextEmail(inquiry, submittedAt);
  const html = isRfq ? buildRfqHtmlEmail(inquiry, submittedAt) : buildHtmlEmail(inquiry, submittedAt);

  try {
    if (process.env.RESEND_API_KEY) {
      await sendWithResend({ inquiry, subject, text, html });
      console.log(isRfq ? "RFQ email sent via Resend." : "Inquiry email sent via Resend.");
      res.status(200).json({ ok: true, provider: "resend" });
      return;
    }

    await sendWithSmtp({ inquiry, subject, text, html });
    console.log(isRfq ? "RFQ email sent via SMTP." : "Inquiry email sent via SMTP.");
    res.status(200).json({ ok: true, provider: "smtp" });
  } catch (error) {
    console.error(isRfq ? "RFQ email failed:" : "Inquiry email failed:", error);
    res.status(500).json({ error: error.message || "Failed to send inquiry email." });
  }
};

async function sendWithSmtp({ inquiry, subject, text, html }) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const notifyTo = process.env.SMTP_TO;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 465);

  console.log("SMTP config check", {
    hasUser: Boolean(smtpUser),
    hasPass: Boolean(smtpPass),
    hasTo: Boolean(notifyTo),
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465
  });

  if (!smtpUser || !smtpPass || !notifyTo) {
    throw new Error("SMTP_USER, SMTP_PASS and SMTP_TO environment variables are required. For Gmail, SMTP_PASS must be an App Password.");
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  await transporter.verify();
  console.log("SMTP transporter verified.");

  const info = await transporter.sendMail({
    from: `"LinfTech Website" <${smtpUser}>`,
    to: notifyTo,
    replyTo: safeText(inquiry.email) || undefined,
    subject,
    text,
    html
  });

  console.log("SMTP send result", {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response
  });

  if (Array.isArray(info.rejected) && info.rejected.length) {
    throw new Error(`SMTP rejected recipients: ${info.rejected.join(", ")}`);
  }
}

async function sendWithResend({ inquiry, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.RESEND_TO || process.env.SMTP_TO;
  const from = process.env.RESEND_FROM || "LinfTech RFQ <onboarding@resend.dev>";

  console.log("Resend config check", {
    hasApiKey: Boolean(apiKey),
    hasTo: Boolean(notifyTo),
    from
  });

  if (!apiKey || !notifyTo) {
    throw new Error("RESEND_API_KEY and RESEND_TO or SMTP_TO are required for Resend email.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [notifyTo],
      reply_to: safeText(inquiry.email) || undefined,
      subject,
      text,
      html
    })
  });

  let result = {};
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(result.message || result.error || `Resend API failed with status ${response.status}`);
  }
}

function buildTextEmail(inquiry, submittedAt) {
  return [
    "New inquiry from LinfTech website",
    "",
    `Name: ${safeText(inquiry.name)}`,
    `Company: ${safeText(inquiry.company)}`,
    `Country: ${safeText(inquiry.country)}`,
    `Email: ${safeText(inquiry.email)}`,
    `WhatsApp: ${safeText(inquiry.whatsapp)}`,
    `Product: ${safeText(inquiry.product)}`,
    `Quantity: ${safeText(inquiry.quantity)}`,
    `Time: ${submittedAt}`,
    "",
    "Message:",
    safeText(inquiry.message)
  ].join("\n");
}

function buildHtmlEmail(inquiry, submittedAt) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
      <h2>New inquiry from LinfTech website</h2>
      <p><strong>Name:</strong> ${escapeHtml(inquiry.name)}</p>
      <p><strong>Company:</strong> ${escapeHtml(inquiry.company)}</p>
      <p><strong>Country:</strong> ${escapeHtml(inquiry.country)}</p>
      <p><strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>
      <p><strong>WhatsApp:</strong> ${escapeHtml(inquiry.whatsapp)}</p>
      <p><strong>Product:</strong> ${escapeHtml(inquiry.product)}</p>
      <p><strong>Quantity:</strong> ${escapeHtml(inquiry.quantity)}</p>
      <p><strong>Time:</strong> ${escapeHtml(submittedAt)}</p>
      <p><strong>Message:</strong></p>
      <div style="padding:12px 14px;background:#f8fbff;border:1px solid #dbeafe;border-radius:8px">
        ${escapeHtml(inquiry.message).replace(/\n/g, "<br>")}
      </div>
    </div>
  `;
}

function buildRfqTextEmail(inquiry, submittedAt) {
  const products = normalizeProducts(inquiry.products);
  const productLines = products.length
    ? products.map((product, index) => [
      `${index + 1}. ${safeText(getProductName(product)) || "RFQ Product"}`,
      `   Product ID: ${safeText(getProductId(product)) || "-"}`,
      `   Category: ${safeText(product.category || product.product_category) || "-"}`,
      `   Quantity: ${safeText(product.quantity || product.qty) || "1"}`,
      `   Notes: ${safeText(product.notes || product.note) || "-"}`,
      `   Image: ${safeText(getProductImage(product)) || "-"}`
    ].join("\n")).join("\n\n")
    : "No products.";

  return [
    "New RFQ Center submission",
    "",
    "Buyer Info",
    `Buyer Name: ${safeText(inquiry.buyer_name || inquiry.name || inquiry.customer_name)}`,
    `Country: ${safeText(inquiry.country)}`,
    `Email: ${safeText(inquiry.email)}`,
    `WhatsApp: ${safeText(inquiry.whatsapp)}`,
    `Created Time: ${submittedAt}`,
    "",
    "Products List",
    productLines,
    "",
    "Purchase Requirements",
    `Expected Quantity: ${safeText(inquiry.expected_quantity || inquiry.quantity)}`,
    `OEM Logo Required: ${safeText(inquiry.oem_logo_required)}`,
    `Custom Packaging Required: ${safeText(inquiry.custom_packaging_required)}`,
    `Sample Order Needed: ${safeText(inquiry.sample_order_needed)}`,
    `Delivery Destination: ${safeText(inquiry.delivery_destination)}`,
    "",
    "Message:",
    safeText(inquiry.message)
  ].join("\n");
}

function buildRfqHtmlEmail(inquiry, submittedAt) {
  const products = normalizeProducts(inquiry.products);
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;background:#f8fafc;padding:20px">
      <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:22px">
        <h2 style="margin:0 0 16px;color:#1d4ed8">New RFQ Center Submission</h2>

        <h3>Buyer Info</h3>
        <p><strong>Buyer Name:</strong> ${escapeHtml(inquiry.buyer_name || inquiry.name || inquiry.customer_name)}</p>
        <p><strong>Country:</strong> ${escapeHtml(inquiry.country)}</p>
        <p><strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>
        <p><strong>WhatsApp:</strong> ${escapeHtml(inquiry.whatsapp)}</p>
        <p><strong>Created Time:</strong> ${escapeHtml(submittedAt)}</p>
        <p><strong>Status:</strong> ${escapeHtml(inquiry.status || "new")}</p>

        <h3 style="margin-top:22px">Products List</h3>
        ${renderProductsHtml(products)}

        <h3 style="margin-top:22px">Purchase Requirements</h3>
        <p><strong>Expected Quantity:</strong> ${escapeHtml(inquiry.expected_quantity || inquiry.quantity)}</p>
        <p><strong>OEM Logo Required:</strong> ${escapeHtml(inquiry.oem_logo_required)}</p>
        <p><strong>Custom Packaging Required:</strong> ${escapeHtml(inquiry.custom_packaging_required)}</p>
        <p><strong>Sample Order Needed:</strong> ${escapeHtml(inquiry.sample_order_needed)}</p>
        <p><strong>Delivery Destination:</strong> ${escapeHtml(inquiry.delivery_destination)}</p>

        <h3 style="margin-top:22px">Message</h3>
        <div style="padding:12px 14px;background:#f8fbff;border:1px solid #dbeafe;border-radius:8px">
          ${escapeHtml(inquiry.message).replace(/\n/g, "<br>")}
        </div>
      </div>
    </div>
  `;
}

function renderProductsHtml(products) {
  if (!products.length) return `<p>No products.</p>`;

  return products.map((product) => {
    const productName = getProductName(product) || "RFQ Product";
    const productImage = getProductImage(product);
    const productId = getProductId(product);
    const imageHtml = productImage
      ? `<img src="${escapeAttribute(productImage)}" alt="${escapeAttribute(productName)}" style="width:80px;height:80px;object-fit:cover;border-radius:12px;border:1px solid #e2e8f0;display:block">`
      : `<div style="width:80px;height:80px;border-radius:12px;background:#e2e8f0;color:#64748b;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">No Image</div>`;

    return `
      <div style="display:flex;gap:14px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:10px;background:#fff">
        <div>${imageHtml}</div>
        <div>
          <p style="margin:0 0 6px"><strong>${escapeHtml(productName)}</strong></p>
          <p style="margin:0;color:#475569">Category: ${escapeHtml(product.category || product.product_category || "-")}</p>
          <p style="margin:0;color:#475569">Quantity: ${escapeHtml(product.quantity || product.qty || 1)}</p>
          <p style="margin:0;color:#475569">Notes: ${escapeHtml(product.notes || product.note || "-")}</p>
          <p style="margin:0;color:#475569">Product ID: ${escapeHtml(productId || "-")}</p>
        </div>
      </div>
    `;
  }).join("");
}

function normalizeProducts(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getProductName(product) {
  return product?.product_name || product?.name || product?.title || "";
}

function getProductImage(product) {
  return product?.product_image || product?.image || product?.image_url || product?.thumbnail || product?.images?.[0] || product?.gallery?.[0] || "";
}

function getProductId(product) {
  return product?.product_id || product?.id || "";
}

function safeText(value) {
  return typeof value === "string" ? value.trim() : String(value || "").trim();
}

function escapeHtml(value) {
  return safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}


