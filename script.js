const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");

if (navToggle && primaryNav) {
  const setMenuState = (open) => {
    navToggle.setAttribute("aria-expanded", String(open));
    primaryNav.classList.toggle("is-open", open);
  };

  navToggle.addEventListener("click", () => {
    setMenuState(navToggle.getAttribute("aria-expanded") !== "true");
  });

  primaryNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && primaryNav.classList.contains("is-open")) {
      setMenuState(false);
      navToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      setMenuState(false);
    }
  });
}

const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

const navLinks = Array.from(
  document.querySelectorAll('.nav__link[href^="#"]')
);
const observedSections = Array.from(
  document.querySelectorAll("main section[id]")
);

if ("IntersectionObserver" in window && navLinks.length && observedSections.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const sectionId = `#${entry.target.id}`;
        navLinks.forEach((link) => {
          link.classList.toggle(
            "is-active",
            link.getAttribute("href") === sectionId
          );
        });
      });
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
  );

  observedSections.forEach((section) => observer.observe(section));
}

const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

if (contactForm && formStatus) {
  const submitButton = contactForm.querySelector('button[type="submit"]');

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!contactForm.reportValidity()) {
      return;
    }

    const payload = Object.fromEntries(new FormData(contactForm).entries());

    formStatus.textContent = "Sending request...";
    formStatus.className = "form-status";
    submitButton.disabled = true;

    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "The request could not be sent. Please try again.");
      }

      contactForm.reset();
      formStatus.textContent =
        "Request received. I will review the details and follow up using the email provided.";
      formStatus.classList.add("is-success");
    } catch (error) {
      formStatus.textContent =
        error instanceof Error
          ? error.message
          : "The request could not be sent. Please try again.";
      formStatus.classList.add("is-error");
    } finally {
      submitButton.disabled = false;
    }
  });
}
