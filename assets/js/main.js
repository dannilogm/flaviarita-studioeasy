/* LP01 · Minicurso de Verbos · Prof. Flávia Rita */

// Configuração do envio do formulário.
// FORM_ENDPOINT: URL que recebe o POST (RD Station, Mailchimp, webhook etc.).
// Enquanto estiver vazio, o formulário só simula o envio.
// THANK_YOU_URL: página de obrigado. Se vazio, mostra a mensagem na própria página.
const FORM_ENDPOINT = '';
const THANK_YOU_URL = '';

(function () {
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
  const params = new URLSearchParams(window.location.search);

  // Máscara de telefone: (31) 99999-9999
  function maskPhone(value) {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  document.querySelectorAll('[data-mask="phone"]').forEach(function (input) {
    input.addEventListener('input', function () {
      input.value = maskPhone(input.value);
    });
  });

  function validate(form) {
    let firstInvalid = null;
    form.querySelectorAll('input[required]').forEach(function (input) {
      let ok = input.value.trim() !== '';
      if (ok && input.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      if (ok && input.dataset.mask === 'phone') ok = input.value.replace(/\D/g, '').length >= 10;
      input.closest('.field').classList.toggle('is-invalid', !ok);
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    return firstInvalid;
  }

  document.querySelectorAll('.lead-form').forEach(function (form) {
    // Repassa UTMs da URL para o envio (ajuda a saber qual anúncio gerou o lead)
    UTM_KEYS.forEach(function (key) {
      if (!params.has(key)) return;
      const hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.name = key;
      hidden.value = params.get(key);
      form.appendChild(hidden);
    });

    const feedback = form.querySelector('.lead-form__feedback');
    const button = form.querySelector('button[type="submit"]');

    form.addEventListener('input', function (e) {
      const field = e.target.closest('.field');
      if (field) field.classList.remove('is-invalid');
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      feedback.className = 'lead-form__feedback';
      feedback.textContent = '';

      const invalid = validate(form);
      if (invalid) {
        feedback.classList.add('is-error');
        feedback.textContent = 'Confira os campos destacados.';
        invalid.focus();
        return;
      }

      const label = button.textContent;
      button.disabled = true;
      button.textContent = 'Enviando...';

      try {
        if (FORM_ENDPOINT) {
          const res = await fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(form) });
          if (!res.ok) throw new Error('HTTP ' + res.status);
        } else {
          console.info('[LP] FORM_ENDPOINT vazio. Dados que seriam enviados:', Object.fromEntries(new FormData(form)));
          await new Promise(function (r) { setTimeout(r, 600); });
        }

        if (THANK_YOU_URL) {
          window.location.href = THANK_YOU_URL;
          return;
        }
        form.classList.add('is-done');
        feedback.classList.add('is-success');
        feedback.textContent = 'Pronto! Seu acesso ao Minicurso de Verbos foi enviado para o seu e-mail.';
      } catch (err) {
        feedback.classList.add('is-error');
        feedback.textContent = 'Não conseguimos enviar agora. Tente de novo em instantes.';
      } finally {
        button.disabled = false;
        button.textContent = label;
      }
    });
  });

  // Depoimentos: duplica a lista para o carrossel girar sem emenda
  document.querySelectorAll('.t-marquee__track').forEach(function (track) {
    const group = track.querySelector('.t-marquee__group');
    if (!group) return;
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  });

  // Rodapé: ano atual, entrada em cascata e listras do divisor
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Cards de tópicos: clique abre/fecha a descrição
  document.querySelectorAll('.topic__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      btn.closest('.topic').classList.toggle('is-open', open);
    });
  });

  // Entrada em cascata: o atraso conta dentro de cada grupo (cards, rodapé)
  const reveals = document.querySelectorAll('[data-reveal]');
  const stripes = document.querySelector('[data-stripes]');
  const groupCount = new Map();
  reveals.forEach(function (el) {
    const group = el.closest('[data-reveal-group]') || document.body;
    const i = groupCount.get(group) || 0;
    groupCount.set(group, i + 1);
    el.style.transitionDelay = (0.1 + i * 0.1) + 's';
  });
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-visible');
        revealObserver.unobserve(el);
        // depois da entrada, tira o atraso para não atrasar outras transições
        setTimeout(function () { el.style.transitionDelay = ''; }, 1500);
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { revealObserver.observe(el); });
    if (stripes) revealObserver.observe(stripes);
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // CTA fixo no mobile: aparece depois do formulário do topo e some perto do formulário final
  const sticky = document.querySelector('.sticky-cta');
  const heroForm = document.getElementById('cadastro');
  const finalSection = document.getElementById('cadastro-final');
  if (sticky && heroForm && finalSection && 'IntersectionObserver' in window) {
    let heroVisible = true;
    let finalVisible = false;
    const update = function () {
      sticky.classList.toggle('is-visible', !heroVisible && !finalVisible);
    };
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === heroForm) heroVisible = entry.isIntersecting;
        if (entry.target === finalSection) finalVisible = entry.isIntersecting;
      });
      update();
    }).observe(heroForm);
    new IntersectionObserver(function (entries) {
      finalVisible = entries[0].isIntersecting;
      update();
    }).observe(finalSection);
  }
})();
