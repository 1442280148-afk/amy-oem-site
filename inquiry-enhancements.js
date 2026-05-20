document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("inquiryForm");

  if (!form) return;

  const config = window.XIQI_SUPABASE;
  const inquirySupabaseClient = getXiqiSupabaseClient(config);
  const button = form.querySelector('button[type="submit"]');
  const status = document.createElement("div");
  const productInput = form.querySelector('[name="product"]');
  const productFromUrl = new URLSearchParams(window.location.search).get("product");

  status.className = "form-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  button.insertAdjacentElement("afterend", status);

  if (productInput && productFromUrl) {
    productInput.value = productFromUrl;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    console.log("Inquiry submit event triggered.");

    if (button.disabled) return;

    setLoading(button, true);
    setStatus(status, "Sending your inquiry...", "");

    const data = {
      name: clean(form.name.value),
      email: clean(form.email.value),
      whatsapp: clean(form.whatsapp.value),
      product: clean(form.product.value),
      message: clean(form.message.value)
    };

    try {
      const { error } = await inquirySupabaseClient
        .from("inquiries")
        .insert([data]);

      if (error) throw error;

      form.reset();

      setStatus(
        status,
        "Inquiry submitted successfully. We will reply within 24 hours.",
        "success"
      );
      console.log("Inquiry saved to Supabase.");

      try {
        await sendInquiryEmail(data);
        console.log("Inquiry email API completed.");
      } catch (mailError) {
        console.warn("Email failed:", mailError);
      }
    } catch (error) {
      console.log(error);

      setStatus(
        status,
        `Submission failed: ${error.message || "Please try again or contact us on WhatsApp."}`,
        "error"
      );
    } finally {
      setLoading(button, false);
    }
  });
});

function setLoading(button, isLoading) {
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.textContent = isLoading ? "Sending..." : "Send Inquiry";
}

function setStatus(status, message, type) {
  status.textContent = message;
  status.className = `form-status ${type}`.trim();
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function sendInquiryEmail(data) {
  console.log("Sending inquiry email API request...");

  const response = await fetch("/api/send-inquiry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...data,
      submitted_at: new Date().toLocaleString()
    })
  });

  let result = {};

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(result.error || `Inquiry email API failed with status ${response.status}`);
  }

  console.log("Inquiry email API success:", result);
  return result;
}

function getXiqiSupabaseClient(config) {
  return window.supabaseClient;
}
