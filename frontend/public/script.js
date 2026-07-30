/* ========================================
   SitePilotIQ Landing Page Scripts
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Feather icons
  feather.replace();

  // --- Auth state check ---
  const authBtn = document.getElementById('authBtn');
  if (authBtn) {
    const apiMeta = document.querySelector('meta[name="api-url"]');
    const apiUrl = apiMeta ? apiMeta.getAttribute('content') : '';

    fetch(apiUrl + '/auth/me', { credentials: 'include' })
      .then(res => {
        if (res.ok) {
          authBtn.textContent = 'Dashboard';
          authBtn.href = '/dashboard';
          authBtn.setAttribute('aria-label', 'Go to Dashboard');
        }
      })
      .catch(() => {
        // API unavailable — keep default Login button
      });
  }

  // --- Header scroll effect ---
  const header = document.getElementById('header');
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- Mobile hamburger ---
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isOpen);
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  // --- Smooth scroll ---
  window.scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Scroll animations (IntersectionObserver) ---
  const animateEls = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger delay based on position in the batch
          const siblings = entry.target.parentElement.querySelectorAll('[data-animate]');
          const index = Array.from(siblings).indexOf(entry.target);
          entry.target.style.transitionDelay = `${index * 0.1}s`;
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    animateEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: show all immediately
    animateEls.forEach(el => el.classList.add('visible'));
  }

  // --- Animated counters ---
  const counters = document.querySelectorAll('.stat-number[data-target], .stat-large[data-target]');
  if ('IntersectionObserver' in window && counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => counterObserver.observe(el));
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 2000;
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // --- Video modal ---
  const modal = document.getElementById('videoModal');
  const modalIframe = modal.querySelector('iframe');
  const watchBtn = document.getElementById('watchDemoBtn');
  const modalClose = document.getElementById('modalClose');

  watchBtn.addEventListener('click', () => {
    modalIframe.src = modalIframe.dataset.src;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    modalClose.focus();
  });

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    // Stop video by clearing src after transition
    setTimeout(() => { modalIframe.src = ''; }, 400);
  }

  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });

  // --- Carousel ---
  const carousel = document.getElementById('carousel');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');

  if (carousel && prevBtn && nextBtn) {
    const scrollAmount = () => carousel.querySelector('.carousel-slide')?.offsetWidth + 24 || 400;
    prevBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
    });
    nextBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });

    // Keyboard navigation
    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') carousel.scrollBy({ left: -scrollAmount(), behavior: 'smooth' });
      if (e.key === 'ArrowRight') carousel.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
    });
  }

  // --- Pricing toggle ---
  const pricingToggle = document.getElementById('pricingToggle');
  const amounts = document.querySelectorAll('.amount[data-monthly]');
  const toggleLabels = document.querySelectorAll('.toggle-label');
  let isAnnual = false;

  if (pricingToggle) {
    pricingToggle.addEventListener('click', () => {
      isAnnual = !isAnnual;
      pricingToggle.classList.toggle('active', isAnnual);
      toggleLabels.forEach(label => {
        const period = label.dataset.period;
        label.classList.toggle('active', (period === 'annual') === isAnnual);
      });
      amounts.forEach(el => {
        const value = isAnnual ? el.dataset.annual : el.dataset.monthly;
        el.textContent = value;
      });
    });
  }

  // --- Footer year ---
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
