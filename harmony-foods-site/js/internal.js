(function () {
  // ---------- helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- folder + doc elements ----------
  const folderButtons = $$(".i-folder");
  const docButtons = $$(".i-doc");
  const docCountEl = $("#docCount");
  const searchEl = $("#docSearch");

  // preview fields
  const pvTitle = $("#pvTitle");
  const pvDate = $("#pvDate");
  const pvFrom = $("#pvFrom");
  const pvStatus = $("#pvStatus");
  const pvBody = $("#pvBody");
  const previewMeta = $("#previewMeta");

  // action buttons (in preview)
  const openBtn = $(".i-actions .i-btn");
  const requestBtn = $(".i-actions .i-btn-ghost");

  // ---------- modal ----------
  const modal = $("#docModal");
  const modalTag = $("#modalTag");
  const modalMeta = $("#modalMeta");
  const modalKicker = $("#modalKicker");
  const modalTitle = $("#modalTitle");
  const modalByline = $("#modalByline");
  const modalBody = $("#modalBody");
  const modalFoot = $("#modalFoot");

  // ---------- data (story-forward) ----------
  // You can expand/adjust these later. For now, we focus on Incidents + a little flavor.
  const DOCS = {
    "ir-001": {
      id: "IR-001",
      tag: "INTERNAL",
      kicker: "Incident Report",
      title: "Incident Report 001",
      byline: "2420-07-03 • Security Operations • Closed",
      meta: "INCIDENTS / IR-001",
      status: "Closed",
      from: "Security Operations",
      date: "2420-07-03",
      previewHtml: `
        <p><strong>Summary:</strong> Unscheduled access attempt identified at a regional terminal. Badge ID did not match assigned employee profile. Access denied automatically.</p>
        <p><strong>Notes:</strong> Pattern does not currently match known intrusion signatures. Recommend monitoring for repeat attempts within 30 days.</p>
        <p class="i-stamp">INTERNAL ONLY — DO NOT DISTRIBUTE</p>
      `,
      fullHtml: `
        <p><strong>Summary:</strong> Unscheduled access attempt identified at a regional terminal. Badge ID did not match assigned employee profile. Access denied automatically.</p>
        <p><strong>Technical:</strong> Terminal handshake completed, credential token rejected (employee profile mismatch). No elevation attempt detected. Automated lockout initiated for 90 seconds.</p>
        <p><strong>Observer note:</strong> Request signature showed a repeating cadence. Not consistent with routine employee behavior.</p>
        <p><strong>Redactions:</strong> Subject identifiers withheld pending compliance review: <span class="redact">EMPLOYEE_ID</span> / <span class="redact">LOCATION_CODE</span>.</p>
      `,
      foot: "INTERNAL ONLY — DO NOT DISTRIBUTE"
    },

    "ir-002": {
      id: "IR-002",
      tag: "INTERNAL",
      kicker: "Incident Report",
      title: "Incident Report 002",
      byline: "2420-08-19 • Security Operations • Under Review",
      meta: "INCIDENTS / IR-002",
      status: "Under Review",
      from: "Security Operations",
      date: "2420-08-19",
      previewHtml: `
        <p><strong>Summary:</strong> Repeat access pattern detected across terminals. Notes appended by Security.</p>
        <p><strong>Notes:</strong> Multiple sessions show similar request pacing. Recommend correlation against audit excerpts.</p>
        <p class="i-stamp">INTERNAL ONLY — DO NOT DISTRIBUTE</p>
      `,
      fullHtml: `
        <p><strong>Summary:</strong> Repeat access pattern detected across terminals. Notes appended by Security.</p>
        <p><strong>Pattern:</strong> Attempts appear shortly after shift change windows. Requests use valid formatting but fail on identity verification.</p>
        <p><strong>Security note:</strong> Treat as a reconnaissance phase until proven otherwise.</p>
        <p><strong>Redactions:</strong> Routing references withheld: <span class="redact">ROUTE_TABLE</span> / <span class="redact">NODE_LIST</span>.</p>
      `,
      foot: "INTERNAL ONLY — DO NOT DISTRIBUTE"
    },

    "ir-003": {
      id: "IR-003",
      tag: "RESTRICTED",
      kicker: "Incident Report",
      title: "Incident Report 003",
      byline: "2420-09-02 • Security Operations • Restricted Routing",
      meta: "INCIDENTS / IR-003",
      status: "Restricted Routing",
      from: "Security Operations",
      date: "2420-09-02",
      previewHtml: `
        <p><strong>Summary:</strong> Escalation flagged. Portions redacted pending compliance approval.</p>
        <p><strong>Notes:</strong> Access path suggests knowledge of internal topology. Additional logging enabled.</p>
        <p class="i-stamp">INTERNAL ONLY — DO NOT DISTRIBUTE</p>
      `,
      fullHtml: `
        <p><strong>Summary:</strong> Escalation flagged. Portions redacted pending compliance approval.</p>
        <p><strong>Security:</strong> Session attempted restricted routing calls. Automated prevention triggered. Logging moved to elevated retention.</p>
        <p><strong>Compliance:</strong> Portions withheld pending approval. Any external inquiry must be routed through Legal.</p>
        <p><strong>Redactions:</strong> <span class="redact">ACCESS_VECTOR</span> / <span class="redact">EXFIL_ATTEMPT</span> / <span class="redact">SUBSYSTEM_NAME</span></p>
      `,
      foot: "RESTRICTED — INTERNAL ONLY — DO NOT DISTRIBUTE"
    }
  };

  let activeFolder = "incidents";
  let activeDocId = "ir-001";

  // ---------- folder filtering ----------
  function applyFolder(folderKey) {
    activeFolder = folderKey;

    // folder button states
    folderButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.folder === folderKey));

    // show/hide docs by folder
    const visibleDocs = docButtons.filter((d) => d.dataset.folder === folderKey);
    docButtons.forEach((d) => {
      const shouldShow = d.dataset.folder === folderKey;
      d.hidden = !shouldShow;
      d.classList.remove("is-active");
    });

    // update count
    if (docCountEl) docCountEl.textContent = String(visibleDocs.length);

    // pick first doc in folder (if any)
    if (visibleDocs[0]) {
      setActiveDoc(visibleDocs[0].dataset.doc);
      visibleDocs[0].classList.add("is-active");
    }
  }

  // ---------- preview ----------
  function setActiveDoc(docKey) {
    activeDocId = docKey;
    const data = DOCS[docKey];
    if (!data) return;

    if (previewMeta) previewMeta.textContent = data.id;
    if (pvTitle) pvTitle.textContent = data.title;
    if (pvDate) pvDate.textContent = data.date;
    if (pvFrom) pvFrom.textContent = data.from;
    if (pvStatus) pvStatus.textContent = data.status;
    if (pvBody) pvBody.innerHTML = data.previewHtml;

    // store which doc open button should open
    if (openBtn) openBtn.dataset.openDoc = docKey;
    if (requestBtn) requestBtn.dataset.openDoc = docKey;
  }

  // ---------- modal open/close ----------
  function openModalFor(docKey) {
    const data = DOCS[docKey];
    if (!data || !modal) return;

    modalTag.textContent = data.tag;
    modalMeta.textContent = data.meta;
    modalKicker.textContent = data.kicker;
    modalTitle.textContent = data.title;
    modalByline.textContent = data.byline;
    modalBody.innerHTML = data.fullHtml;
    modalFoot.textContent = data.foot;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // close handlers
  if (modal) {
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.matches("[data-close]")) closeModal();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  // ---------- events ----------
  folderButtons.forEach((b) => {
    b.addEventListener("click", () => {
      if (b.disabled) return;
      applyFolder(b.dataset.folder);
    });
  });

  docButtons.forEach((d) => {
    d.addEventListener("click", () => {
      docButtons.forEach((x) => x.classList.remove("is-active"));
      d.classList.add("is-active");
      setActiveDoc(d.dataset.doc);
    });
  });

  // search (within currently visible docs)
  if (searchEl) {
    searchEl.addEventListener("input", () => {
      const q = searchEl.value.trim().toLowerCase();
      const visible = docButtons.filter((d) => d.dataset.folder === activeFolder);
      let count = 0;

      visible.forEach((d) => {
        const text = d.textContent.toLowerCase();
        const match = !q || text.includes(q);
        d.hidden = !match;
        if (match) count++;
      });

      if (docCountEl) docCountEl.textContent = String(count);
    });
  }

  // "Open document" in preview
  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const key = openBtn.dataset.openDoc || activeDocId;
      openModalFor(key);
    });
  }

  // "Request access" (just opens same modal for now, can change later)
  if (requestBtn) {
    requestBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const key = requestBtn.dataset.openDoc || activeDocId;
      openModalFor(key);
    });
  }

  // ---------- init ----------
  // If page loads with incidents visible, ensure preview matches
  applyFolder(activeFolder);
})();
// =============================
// Internal Document Modal (Step 3)
// =============================
(() => {
  const modal = document.getElementById("docModal");
  const docBody = document.getElementById("docBody");
  const docTitle = document.getElementById("docTitle");
  const docByline = document.getElementById("docByline");
  const docMetaLine = document.getElementById("docMetaLine");
  const previewMeta = document.getElementById("previewMeta");

  if (!modal || !docBody || !docTitle || !docByline || !docMetaLine) return;

  // Your “actual report” content lives here.
  // (You can add more docs later: ir-002, ir-003, memos, etc.)
  const DOCS = {
    "ir-001": {
      tag: "INTERNAL",
      meta: "IR-001 • Security Operations • Closed",
      title: "Incident Report 001",
      byline: "2420-07-03 • Security Operations • Closed",
      body: `
        <p><strong>Incident ID:</strong> IR-001</p>
        <p><strong>Location:</strong> Regional Terminal — Dock Access Node 04</p>
        <p><strong>Classification:</strong> Internal</p>
        <hr>

        <h3>Summary</h3>
        <p>
          Unscheduled access attempt identified at a regional terminal. Badge ID did not match
          assigned employee profile. Access was denied automatically by gateway ruleset HF-AGW-2.
        </p>

        <h3>Timeline</h3>
        <ul>
          <li><strong>07:14:09</strong> — Badge scan initiated</li>
          <li><strong>07:14:10</strong> — Mismatch detected (Profile/Badge divergence)</li>
          <li><strong>07:14:11</strong> — Access denied (auto)</li>
          <li><strong>07:14:18</strong> — Second attempt blocked (rate limit)</li>
        </ul>

        <h3>Findings</h3>
        <p>
          Pattern does not currently match known intrusion signatures. No escalation required at this time.
          Recommend monitoring for repeat attempts within 30 days.
        </p>

        <h3>Notes</h3>
        <p>
          Employee associated profile was marked <em>inactive</em> in staffing registry, but badge remained
          physically active. Ticket filed with IT Security to audit badge lifecycle workflow.
        </p>

        <p class="i-stamp">INTERNAL ONLY — DO NOT DISTRIBUTE</p>
      `
    }
  };

  function openModal(docId) {
    const doc = DOCS[docId] || DOCS["ir-001"];

    // Fill modal fields
    document.getElementById("docTag").textContent = doc.tag;
    docMetaLine.textContent = doc.meta;
    docTitle.textContent = doc.title;
    docByline.textContent = doc.byline;
    docBody.innerHTML = doc.body;

    // Optional: keep the preview meta in sync
    if (previewMeta) previewMeta.textContent = (docId || "ir-001").toUpperCase();

    // Show modal
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  // Open
  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const docId = btn.getAttribute("data-doc") || "ir-001";
      openModal(docId);
    });
  });

  // Close
  document.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
})();
/* ================================
   Prickles Restricted Access Logic
   ================================ */

(function () {
  const restrictedBtn = document.getElementById("restrictedBtn");
  const restrictedStatus = document.getElementById("restrictedStatus");

  if (!restrictedBtn) return;

  const unlocked = localStorage.getItem("hf_prickles_unlocked") === "1";

  if (unlocked) {
    // Visually unlock it
    restrictedBtn.classList.remove("is-locked");
    restrictedStatus.textContent = "UNLOCKED";
    restrictedStatus.style.color = "#3EFFBF"; // mint accent
  }

  restrictedBtn.addEventListener("click", function () {
    window.location.href = "falken.html#ttt";
  });

})();

