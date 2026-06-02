import type { ZeroAPISpec } from "@ludagg/zeroapi-runtime";

/**
 * The 7 official ZeroAPI marketplace templates.
 *
 * These are real, complete `ZeroAPISpec` blueprints — not skeletons. Each one
 * exercises the runtime's richer features (JWT auth + roles, RBAC permissions,
 * soft-delete, timestamps, state machines, many-to-many relations and
 * multi-tenant row scoping) so a user starts from a production-shaped API.
 *
 * They are seeded into the `Template` table (isOfficial=true, PUBLIC) by
 * `scripts/seed-templates.ts`. The `id`s are stable so the seeder is idempotent.
 */
export type OfficialTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  emoji: string;
  spec: ZeroAPISpec;
};

/** Shared modern JWT auth block (register/login/refresh + verification). */
const JWT_AUTH: ZeroAPISpec["auth"] = {
  enabled: true,
  strategies: ["jwt"],
  jwt: { enabled: true, accessTokenTTL: "15m", refreshTokenTTL: "30d", secretEnv: "JWT_SECRET" },
  emailVerification: true,
  passwordReset: true,
};

const AUTH_FLOWS: ZeroAPISpec["authFlows"] = {
  emailVerification: true,
  passwordReset: true,
  refreshTokens: true,
  revocation: true,
  lockout: { maxAttempts: 5, windowMs: 900_000 },
};

// ── 1. Blog / CMS ────────────────────────────────────────────────────────────
const blogCms: ZeroAPISpec = {
  version: "0.23",
  name: "blog_cms",
  description: "Blog / CMS headless : articles, catégories, tags, pages et modération des commentaires.",
  auth: JWT_AUTH,
  authFlows: AUTH_FLOWS,
  roles: [
    { name: "admin", description: "Accès total, gestion des utilisateurs et publication." },
    { name: "editor", description: "Relit, publie et modère." },
    { name: "author", description: "Rédige ses propres articles." },
  ],
  rateLimit: { windowMs: 60_000, max: 120, byUser: true },
  resources: [
    {
      name: "Category",
      description: "Catégorie éditoriale.",
      fields: {
        name: { type: "string", required: true, unique: true, maxLength: 80 },
        slug: { type: "string", required: true, unique: true, index: true },
        description: { type: "text" },
      },
      timestamps: true,
    },
    {
      name: "Tag",
      description: "Étiquette transverse.",
      fields: {
        name: { type: "string", required: true, unique: true, maxLength: 50 },
        slug: { type: "string", required: true, unique: true, index: true },
      },
      timestamps: true,
    },
    {
      name: "Post",
      description: "Article de blog avec cycle de vie éditorial.",
      fields: {
        title: { type: "string", required: true, maxLength: 180 },
        slug: { type: "string", required: true, unique: true, index: true },
        excerpt: { type: "text" },
        content: { type: "text", required: true },
        coverImage: { type: "file", accept: ["image/png", "image/jpeg", "image/webp"], storage: "r2" },
        status: { type: "enum", values: ["draft", "published", "archived"], required: true, default: "draft" },
        publishedAt: { type: "datetime" },
      },
      relations: [
        { type: "manyToOne", resource: "Category", field: "categoryId", required: true, onDelete: "Restrict" },
        { type: "manyToMany", resource: "Tag", through: "post_tags" },
        { type: "oneToMany", resource: "Comment" },
      ],
      stateMachine: {
        field: "status",
        initial: "draft",
        transitions: [
          { from: "draft", to: "published", roles: ["admin", "editor"] },
          { from: "published", to: "archived", roles: ["admin", "editor"] },
          { from: "archived", to: "published", roles: ["admin", "editor"] },
        ],
      },
      softDelete: true,
      timestamps: true,
      searchable: ["title", "excerpt", "content"],
      aggregates: [{ name: "commentCount", op: "count", relation: "Comment" }],
    },
    {
      name: "Comment",
      description: "Commentaire visiteur, modéré avant publication.",
      fields: {
        authorName: { type: "string", required: true, maxLength: 80 },
        authorEmail: { type: "email", required: true },
        body: { type: "text", required: true, maxLength: 2000 },
        status: { type: "enum", values: ["pending", "approved", "spam"], required: true, default: "pending" },
      },
      relations: [{ type: "manyToOne", resource: "Post", field: "postId", required: true, onDelete: "Cascade" }],
      stateMachine: {
        field: "status",
        initial: "pending",
        transitions: [
          { from: "pending", to: "approved", roles: ["admin", "editor"] },
          { from: "pending", to: "spam", roles: ["admin", "editor"] },
          { from: "approved", to: "spam", roles: ["admin", "editor"] },
        ],
      },
      timestamps: true,
    },
    {
      name: "Page",
      description: "Page statique (À propos, CGU…).",
      fields: {
        title: { type: "string", required: true, maxLength: 180 },
        slug: { type: "string", required: true, unique: true, index: true },
        content: { type: "text", required: true },
        published: { type: "boolean", default: false },
      },
      softDelete: true,
      timestamps: true,
    },
  ],
  permissions: [
    { resource: "Post", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "editor", actions: ["create", "read", "update", "delete"] },
      { role: "author", actions: ["create", "read", "update"], ownOnly: true },
    ] },
    { resource: "Comment", rules: [
      { role: "admin", actions: ["read", "update", "delete"] },
      { role: "editor", actions: ["read", "update", "delete"] },
    ] },
  ],
};

// ── 2. E-commerce ─────────────────────────────────────────────────────────────
const ecommerce: ZeroAPISpec = {
  version: "0.23",
  name: "ecommerce",
  description: "Boutique en ligne : catalogue, panier, commandes avec workflow paid→shipped→delivered et paiements.",
  auth: JWT_AUTH,
  authFlows: AUTH_FLOWS,
  roles: [
    { name: "admin", description: "Gère le catalogue et les commandes." },
    { name: "manager", description: "Traite les commandes et le stock." },
    { name: "customer", description: "Achète et suit ses commandes." },
  ],
  rateLimit: { windowMs: 60_000, max: 120, byUser: true },
  resources: [
    {
      name: "Category",
      fields: {
        name: { type: "string", required: true, unique: true },
        slug: { type: "string", required: true, unique: true, index: true },
      },
      timestamps: true,
    },
    {
      name: "Product",
      description: "Article vendable avec stock et prix.",
      fields: {
        name: { type: "string", required: true, maxLength: 180 },
        slug: { type: "string", required: true, unique: true, index: true },
        description: { type: "text" },
        sku: { type: "string", required: true, unique: true },
        price: { type: "decimal", required: true, min: 0 },
        currency: { type: "enum", values: ["XAF", "XOF", "USD", "EUR"], default: "XAF" },
        stock: { type: "integer", required: true, default: 0, min: 0 },
        status: { type: "enum", values: ["active", "draft", "archived"], default: "active" },
        images: { type: "file[]", accept: ["image/*"], storage: "r2", multiple: true },
      },
      relations: [{ type: "manyToOne", resource: "Category", field: "categoryId", required: true, onDelete: "Restrict" }],
      softDelete: true,
      timestamps: true,
      searchable: ["name", "description", "sku"],
    },
    {
      name: "Order",
      description: "Commande client avec machine à états pending→paid→shipped→delivered.",
      fields: {
        reference: { type: "string", required: true, unique: true, index: true },
        customerEmail: { type: "email", required: true },
        shippingAddress: { type: "text", required: true },
        total: { type: "decimal", required: true, min: 0 },
        currency: { type: "enum", values: ["XAF", "XOF", "USD", "EUR"], default: "XAF" },
        status: { type: "enum", values: ["pending", "paid", "shipped", "delivered", "cancelled"], required: true, default: "pending" },
      },
      relations: [{ type: "oneToMany", resource: "OrderItem" }],
      stateMachine: {
        field: "status",
        initial: "pending",
        transitions: [
          { from: "pending", to: "paid" },
          { from: "paid", to: "shipped", roles: ["admin", "manager"] },
          { from: "shipped", to: "delivered", roles: ["admin", "manager"] },
          { from: "pending", to: "cancelled", roles: ["admin", "manager", "customer"] },
          { from: "paid", to: "cancelled", roles: ["admin", "manager"] },
        ],
      },
      aggregates: [
        { name: "itemCount", op: "count", relation: "OrderItem" },
        { name: "unitsSold", op: "sum", relation: "OrderItem", field: "quantity" },
      ],
      timestamps: true,
    },
    {
      name: "OrderItem",
      description: "Ligne de commande (snapshot du prix).",
      fields: {
        quantity: { type: "integer", required: true, min: 1 },
        unitPrice: { type: "decimal", required: true, min: 0 },
      },
      relations: [
        { type: "manyToOne", resource: "Order", field: "orderId", required: true, onDelete: "Cascade" },
        { type: "manyToOne", resource: "Product", field: "productId", required: true, onDelete: "Restrict" },
      ],
      timestamps: true,
    },
    {
      name: "Payment",
      description: "Tentative de paiement rattachée à une commande.",
      fields: {
        amount: { type: "decimal", required: true, min: 0 },
        provider: { type: "enum", values: ["stripe", "mtn_momo", "orange_money", "wave"], required: true },
        reference: { type: "string", required: true, unique: true },
        status: { type: "enum", values: ["pending", "succeeded", "failed", "refunded"], required: true, default: "pending" },
      },
      relations: [{ type: "manyToOne", resource: "Order", field: "orderId", required: true, onDelete: "Cascade" }],
      stateMachine: {
        field: "status",
        initial: "pending",
        transitions: [
          { from: "pending", to: "succeeded" },
          { from: "pending", to: "failed" },
          { from: "succeeded", to: "refunded", roles: ["admin"] },
        ],
      },
      timestamps: true,
    },
  ],
  permissions: [
    { resource: "Product", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "manager", actions: ["create", "read", "update"] },
      { role: "customer", actions: ["read"] },
    ] },
    { resource: "Order", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "manager", actions: ["read", "update"] },
      { role: "customer", actions: ["create", "read"], ownOnly: true },
    ] },
  ],
};

// ── 3. App de réservation ─────────────────────────────────────────────────────
const booking: ZeroAPISpec = {
  version: "0.23",
  name: "booking",
  description: "Prise de rendez-vous : prestations, praticiens, créneaux et cycle confirmé→honoré avec avis.",
  auth: JWT_AUTH,
  authFlows: AUTH_FLOWS,
  roles: [
    { name: "admin", description: "Configure l'agenda et les prestations." },
    { name: "staff", description: "Gère ses propres rendez-vous." },
    { name: "customer", description: "Réserve et laisse un avis." },
  ],
  rateLimit: { windowMs: 60_000, max: 100, byUser: true },
  resources: [
    {
      name: "Service",
      description: "Prestation réservable (durée + prix).",
      fields: {
        name: { type: "string", required: true, maxLength: 120 },
        description: { type: "text" },
        durationMin: { type: "integer", required: true, min: 5, max: 480 },
        price: { type: "decimal", required: true, min: 0 },
        active: { type: "boolean", default: true },
      },
      softDelete: true,
      timestamps: true,
      searchable: ["name", "description"],
    },
    {
      name: "Staff",
      description: "Praticien / prestataire.",
      fields: {
        name: { type: "string", required: true },
        email: { type: "email", required: true, unique: true },
        specialty: { type: "string" },
        bio: { type: "text" },
        active: { type: "boolean", default: true },
      },
      relations: [{ type: "manyToMany", resource: "Service", through: "staff_services" }],
      timestamps: true,
    },
    {
      name: "Customer",
      fields: {
        name: { type: "string", required: true },
        email: { type: "email", required: true, unique: true },
        phone: { type: "string" },
      },
      timestamps: true,
    },
    {
      name: "Appointment",
      description: "Rendez-vous avec machine à états pending→confirmed→completed.",
      fields: {
        startsAt: { type: "datetime", required: true, index: true },
        endsAt: { type: "datetime", required: true },
        notes: { type: "text" },
        status: { type: "enum", values: ["pending", "confirmed", "completed", "cancelled", "no_show"], required: true, default: "pending" },
      },
      relations: [
        { type: "manyToOne", resource: "Service", field: "serviceId", required: true, onDelete: "Restrict" },
        { type: "manyToOne", resource: "Staff", field: "staffId", required: true, onDelete: "Restrict" },
        { type: "manyToOne", resource: "Customer", field: "customerId", required: true, onDelete: "Cascade" },
      ],
      stateMachine: {
        field: "status",
        initial: "pending",
        transitions: [
          { from: "pending", to: "confirmed", roles: ["admin", "staff"] },
          { from: "confirmed", to: "completed", roles: ["admin", "staff"] },
          { from: "confirmed", to: "no_show", roles: ["admin", "staff"] },
          { from: "pending", to: "cancelled" },
          { from: "confirmed", to: "cancelled" },
        ],
      },
      timestamps: true,
    },
    {
      name: "Review",
      description: "Avis client après un rendez-vous honoré.",
      fields: {
        rating: { type: "integer", required: true, min: 1, max: 5 },
        comment: { type: "text" },
      },
      relations: [
        { type: "manyToOne", resource: "Appointment", field: "appointmentId", required: true, onDelete: "Cascade" },
        { type: "manyToOne", resource: "Staff", field: "staffId", required: true, onDelete: "Cascade" },
      ],
      timestamps: true,
    },
  ],
  permissions: [
    { resource: "Appointment", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "staff", actions: ["read", "update"] },
      { role: "customer", actions: ["create", "read"], ownOnly: true },
    ] },
    { resource: "Service", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "staff", actions: ["read"] },
      { role: "customer", actions: ["read"] },
    ] },
  ],
};

// ── 4. App de livraison ───────────────────────────────────────────────────────
const delivery: ZeroAPISpec = {
  version: "0.23",
  name: "delivery",
  description: "Livraison à la demande : restaurants, menus, commandes temps réel et suivi coursier.",
  auth: JWT_AUTH,
  authFlows: AUTH_FLOWS,
  roles: [
    { name: "admin", description: "Supervise la plateforme." },
    { name: "restaurant", description: "Gère son menu et ses commandes." },
    { name: "courier", description: "Accepte et livre les courses." },
    { name: "customer", description: "Commande et suit la livraison." },
  ],
  rateLimit: { windowMs: 60_000, max: 150, byUser: true },
  resources: [
    {
      name: "Restaurant",
      fields: {
        name: { type: "string", required: true },
        address: { type: "text", required: true },
        phone: { type: "string", required: true },
        lat: { type: "decimal" },
        lng: { type: "decimal" },
        isOpen: { type: "boolean", default: true },
      },
      timestamps: true,
      searchable: ["name", "address"],
    },
    {
      name: "MenuItem",
      fields: {
        name: { type: "string", required: true },
        description: { type: "text" },
        price: { type: "decimal", required: true, min: 0 },
        available: { type: "boolean", default: true },
      },
      relations: [{ type: "manyToOne", resource: "Restaurant", field: "restaurantId", required: true, onDelete: "Cascade" }],
      timestamps: true,
    },
    {
      name: "Order",
      description: "Commande avec workflow placed→preparing→delivered.",
      fields: {
        deliveryAddress: { type: "text", required: true },
        total: { type: "decimal", required: true, min: 0 },
        status: { type: "enum", values: ["placed", "accepted", "preparing", "ready", "picked_up", "delivered", "cancelled"], required: true, default: "placed" },
      },
      relations: [
        { type: "manyToOne", resource: "Restaurant", field: "restaurantId", required: true, onDelete: "Restrict" },
        { type: "oneToMany", resource: "OrderItem" },
      ],
      stateMachine: {
        field: "status",
        initial: "placed",
        transitions: [
          { from: "placed", to: "accepted", roles: ["admin", "restaurant"] },
          { from: "accepted", to: "preparing", roles: ["admin", "restaurant"] },
          { from: "preparing", to: "ready", roles: ["admin", "restaurant"] },
          { from: "ready", to: "picked_up", roles: ["admin", "courier"] },
          { from: "picked_up", to: "delivered", roles: ["admin", "courier"] },
          { from: "placed", to: "cancelled", roles: ["admin", "restaurant", "customer"] },
        ],
      },
      aggregates: [{ name: "itemCount", op: "count", relation: "OrderItem" }],
      timestamps: true,
    },
    {
      name: "OrderItem",
      fields: {
        quantity: { type: "integer", required: true, min: 1 },
        unitPrice: { type: "decimal", required: true, min: 0 },
      },
      relations: [
        { type: "manyToOne", resource: "Order", field: "orderId", required: true, onDelete: "Cascade" },
        { type: "manyToOne", resource: "MenuItem", field: "menuItemId", required: true, onDelete: "Restrict" },
      ],
      timestamps: true,
    },
    {
      name: "Courier",
      fields: {
        name: { type: "string", required: true },
        phone: { type: "string", required: true },
        vehicle: { type: "enum", values: ["bike", "scooter", "car"], default: "scooter" },
        status: { type: "enum", values: ["offline", "available", "busy"], default: "offline" },
        lat: { type: "decimal" },
        lng: { type: "decimal" },
      },
      timestamps: true,
    },
    {
      name: "Delivery",
      description: "Affectation d'une course à un coursier, avec suivi.",
      fields: {
        status: { type: "enum", values: ["assigned", "picked_up", "en_route", "delivered", "failed"], required: true, default: "assigned" },
        pickedUpAt: { type: "datetime" },
        deliveredAt: { type: "datetime" },
      },
      relations: [
        { type: "manyToOne", resource: "Order", field: "orderId", required: true, onDelete: "Cascade" },
        { type: "manyToOne", resource: "Courier", field: "courierId", required: true, onDelete: "Restrict" },
      ],
      stateMachine: {
        field: "status",
        initial: "assigned",
        transitions: [
          { from: "assigned", to: "picked_up", roles: ["admin", "courier"] },
          { from: "picked_up", to: "en_route", roles: ["admin", "courier"] },
          { from: "en_route", to: "delivered", roles: ["admin", "courier"] },
          { from: "assigned", to: "failed", roles: ["admin", "courier"] },
          { from: "picked_up", to: "failed", roles: ["admin", "courier"] },
        ],
      },
      timestamps: true,
    },
  ],
  permissions: [
    { resource: "Order", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "restaurant", actions: ["read", "update"] },
      { role: "courier", actions: ["read", "update"] },
      { role: "customer", actions: ["create", "read"], ownOnly: true },
    ] },
    { resource: "MenuItem", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "restaurant", actions: ["create", "read", "update", "delete"] },
      { role: "customer", actions: ["read"] },
    ] },
  ],
};

// ── 5. Mobile Money / Paiements ───────────────────────────────────────────────
const mobileMoney: ZeroAPISpec = {
  version: "0.23",
  name: "mobile_money",
  description: "Portefeuilles électroniques : dépôts, retraits, transferts MoMo/Orange/Wave et factures.",
  auth: JWT_AUTH,
  authFlows: AUTH_FLOWS,
  roles: [
    { name: "admin", description: "Supervise les flux et débloque les comptes." },
    { name: "merchant", description: "Encaisse et émet des factures." },
    { name: "user", description: "Gère son portefeuille et ses transferts." },
  ],
  rateLimit: { windowMs: 60_000, max: 90, byUser: true },
  resources: [
    {
      name: "Wallet",
      description: "Portefeuille rattaché à un titulaire (scope multi-tenant par owner).",
      fields: {
        ownerId: { type: "uuid", required: true, index: true },
        currency: { type: "enum", values: ["XAF", "XOF", "USD", "EUR"], required: true, default: "XAF" },
        balance: { type: "decimal", required: true, default: 0, min: 0 },
        status: { type: "enum", values: ["active", "frozen", "closed"], required: true, default: "active" },
      },
      stateMachine: {
        field: "status",
        initial: "active",
        transitions: [
          { from: "active", to: "frozen", roles: ["admin"] },
          { from: "frozen", to: "active", roles: ["admin"] },
          { from: "active", to: "closed", roles: ["admin"] },
        ],
      },
      timestamps: true,
    },
    {
      name: "PaymentMethod",
      fields: {
        ownerId: { type: "uuid", required: true, index: true },
        type: { type: "enum", values: ["momo", "bank", "card"], required: true },
        label: { type: "string", required: true },
        details: { type: "json" },
        verified: { type: "boolean", default: false },
      },
      timestamps: true,
    },
    {
      name: "Transaction",
      description: "Mouvement sur un portefeuille (machine à états pending→completed).",
      fields: {
        reference: { type: "string", required: true, unique: true, index: true },
        type: { type: "enum", values: ["deposit", "withdrawal", "payment"], required: true },
        amount: { type: "decimal", required: true, min: 0 },
        provider: { type: "enum", values: ["mtn_momo", "orange_money", "wave", "card"], required: true },
        status: { type: "enum", values: ["pending", "completed", "failed", "reversed"], required: true, default: "pending" },
      },
      relations: [{ type: "manyToOne", resource: "Wallet", field: "walletId", required: true, onDelete: "Cascade" }],
      stateMachine: {
        field: "status",
        initial: "pending",
        transitions: [
          { from: "pending", to: "completed" },
          { from: "pending", to: "failed" },
          { from: "completed", to: "reversed", roles: ["admin"] },
        ],
      },
      timestamps: true,
    },
    {
      name: "Transfer",
      description: "Transfert entre deux portefeuilles.",
      fields: {
        reference: { type: "string", required: true, unique: true, index: true },
        amount: { type: "decimal", required: true, min: 1 },
        status: { type: "enum", values: ["pending", "completed", "failed"], required: true, default: "pending" },
      },
      relations: [
        { type: "manyToOne", resource: "Wallet", field: "fromWalletId", required: true, onDelete: "Restrict" },
        { type: "manyToOne", resource: "Wallet", field: "toWalletId", required: true, onDelete: "Restrict" },
      ],
      stateMachine: {
        field: "status",
        initial: "pending",
        transitions: [
          { from: "pending", to: "completed" },
          { from: "pending", to: "failed" },
        ],
      },
      timestamps: true,
    },
    {
      name: "Invoice",
      description: "Facture émise par un marchand.",
      fields: {
        number: { type: "string", required: true, unique: true, index: true },
        amount: { type: "decimal", required: true, min: 0 },
        dueDate: { type: "date" },
        status: { type: "enum", values: ["unpaid", "paid", "cancelled"], required: true, default: "unpaid" },
      },
      relations: [{ type: "manyToOne", resource: "Wallet", field: "walletId", required: true, onDelete: "Cascade" }],
      stateMachine: {
        field: "status",
        initial: "unpaid",
        transitions: [
          { from: "unpaid", to: "paid" },
          { from: "unpaid", to: "cancelled", roles: ["admin", "merchant"] },
        ],
      },
      timestamps: true,
    },
  ],
  permissions: [
    { resource: "Wallet", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "user", actions: ["read"], scope: { column: "ownerId", claim: "sub" } },
      { role: "merchant", actions: ["read"], scope: { column: "ownerId", claim: "sub" } },
    ] },
    { resource: "Transaction", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "user", actions: ["create", "read"], ownOnly: true },
    ] },
  ],
};

// ── 6. Réseau social ─────────────────────────────────────────────────────────
const social: ZeroAPISpec = {
  version: "0.23",
  name: "social_network",
  description: "Réseau social : profils, posts, likes, commentaires, abonnements (follow) et messagerie.",
  auth: JWT_AUTH,
  authFlows: AUTH_FLOWS,
  roles: [
    { name: "admin", description: "Modère le contenu et les profils." },
    { name: "user", description: "Publie, suit et discute." },
  ],
  rateLimit: { windowMs: 60_000, max: 200, byUser: true },
  resources: [
    {
      name: "Profile",
      description: "Profil public avec graphe d'abonnements (self many-to-many).",
      fields: {
        username: { type: "string", required: true, unique: true, index: true, maxLength: 30 },
        displayName: { type: "string", required: true, maxLength: 80 },
        bio: { type: "text", maxLength: 280 },
        avatar: { type: "file", accept: ["image/*"], storage: "r2" },
        verified: { type: "boolean", default: false },
      },
      relations: [
        { type: "manyToMany", resource: "Profile", through: "follows", as: "following", reverseAs: "followers" },
        { type: "oneToMany", resource: "Post" },
      ],
      timestamps: true,
      searchable: ["username", "displayName"],
      aggregates: [
        { name: "postCount", op: "count", relation: "Post" },
      ],
    },
    {
      name: "Post",
      description: "Publication avec visibilité et compteurs.",
      fields: {
        content: { type: "text", required: true, maxLength: 5000 },
        image: { type: "file", accept: ["image/*"], storage: "r2" },
        visibility: { type: "enum", values: ["public", "followers", "private"], required: true, default: "public" },
        status: { type: "enum", values: ["published", "hidden", "removed"], required: true, default: "published" },
      },
      relations: [
        { type: "manyToOne", resource: "Profile", field: "authorId", required: true, onDelete: "Cascade" },
        { type: "oneToMany", resource: "Like" },
        { type: "oneToMany", resource: "Comment" },
      ],
      stateMachine: {
        field: "status",
        initial: "published",
        transitions: [
          { from: "published", to: "hidden", roles: ["admin", "user"] },
          { from: "hidden", to: "published", roles: ["admin", "user"] },
          { from: "published", to: "removed", roles: ["admin"] },
        ],
      },
      softDelete: true,
      timestamps: true,
      searchable: ["content"],
      aggregates: [
        { name: "likeCount", op: "count", relation: "Like" },
        { name: "commentCount", op: "count", relation: "Comment" },
      ],
    },
    {
      name: "Comment",
      fields: {
        body: { type: "text", required: true, maxLength: 2000 },
      },
      relations: [
        { type: "manyToOne", resource: "Post", field: "postId", required: true, onDelete: "Cascade" },
        { type: "manyToOne", resource: "Profile", field: "authorId", required: true, onDelete: "Cascade" },
      ],
      softDelete: true,
      timestamps: true,
    },
    {
      name: "Like",
      fields: {},
      relations: [
        { type: "manyToOne", resource: "Post", field: "postId", required: true, onDelete: "Cascade" },
        { type: "manyToOne", resource: "Profile", field: "profileId", required: true, onDelete: "Cascade" },
      ],
      timestamps: true,
    },
    {
      name: "Message",
      description: "Message privé entre deux profils.",
      fields: {
        body: { type: "text", required: true, maxLength: 5000 },
        readAt: { type: "datetime" },
      },
      relations: [
        { type: "manyToOne", resource: "Profile", field: "senderId", required: true, onDelete: "Cascade" },
        { type: "manyToOne", resource: "Profile", field: "recipientId", required: true, onDelete: "Cascade" },
      ],
      timestamps: true,
    },
  ],
  permissions: [
    { resource: "Post", rules: [
      { role: "admin", actions: ["create", "read", "update", "delete"] },
      { role: "user", actions: ["create", "read", "update", "delete"], ownOnly: true },
    ] },
    { resource: "Message", rules: [
      { role: "user", actions: ["create", "read"], ownOnly: true },
    ] },
  ],
};

// ── 7. SaaS multi-tenant ──────────────────────────────────────────────────────
const saas: ZeroAPISpec = {
  version: "0.23",
  name: "saas_multitenant",
  description: "SaaS B2B multi-tenant : organisations, membres, projets, tâches, abonnements et facturation.",
  auth: JWT_AUTH,
  authFlows: AUTH_FLOWS,
  roles: [
    { name: "owner", description: "Propriétaire de l'organisation, facturation incluse." },
    { name: "admin", description: "Administre l'organisation." },
    { name: "member", description: "Travaille sur les projets de son organisation." },
  ],
  rateLimit: { windowMs: 60_000, max: 150, byUser: true },
  resources: [
    {
      name: "Organization",
      description: "Tenant racine. Toutes les ressources métier sont scopées dessus.",
      fields: {
        name: { type: "string", required: true },
        slug: { type: "string", required: true, unique: true, index: true },
        plan: { type: "enum", values: ["free", "pro", "business"], required: true, default: "free" },
      },
      timestamps: true,
    },
    {
      name: "Member",
      description: "Appartenance d'un utilisateur à une organisation (rôle par tenant).",
      fields: {
        organizationId: { type: "uuid", required: true, index: true },
        userId: { type: "uuid", required: true, index: true },
        email: { type: "email", required: true },
        role: { type: "enum", values: ["owner", "admin", "member"], required: true, default: "member" },
        invitedAt: { type: "datetime" },
      },
      timestamps: true,
    },
    {
      name: "Project",
      description: "Projet appartenant à une organisation (multi-tenant scope).",
      fields: {
        organizationId: { type: "uuid", required: true, index: true },
        name: { type: "string", required: true },
        description: { type: "text" },
        status: { type: "enum", values: ["active", "archived"], required: true, default: "active" },
      },
      relations: [{ type: "oneToMany", resource: "Task" }],
      softDelete: true,
      timestamps: true,
      searchable: ["name", "description"],
      aggregates: [{ name: "taskCount", op: "count", relation: "Task" }],
    },
    {
      name: "Task",
      description: "Tâche d'un projet avec workflow todo→in_progress→done.",
      fields: {
        organizationId: { type: "uuid", required: true, index: true },
        title: { type: "string", required: true },
        description: { type: "text" },
        priority: { type: "enum", values: ["low", "medium", "high"], default: "medium" },
        status: { type: "enum", values: ["todo", "in_progress", "done", "cancelled"], required: true, default: "todo" },
        dueDate: { type: "date" },
      },
      relations: [{ type: "manyToOne", resource: "Project", field: "projectId", required: true, onDelete: "Cascade" }],
      stateMachine: {
        field: "status",
        initial: "todo",
        transitions: [
          { from: "todo", to: "in_progress" },
          { from: "in_progress", to: "done" },
          { from: "in_progress", to: "todo" },
          { from: "todo", to: "cancelled" },
          { from: "in_progress", to: "cancelled" },
        ],
      },
      timestamps: true,
    },
    {
      name: "Subscription",
      description: "Abonnement de l'organisation (Stripe-like).",
      fields: {
        organizationId: { type: "uuid", required: true, unique: true, index: true },
        plan: { type: "enum", values: ["free", "pro", "business"], required: true, default: "free" },
        seats: { type: "integer", required: true, default: 1, min: 1 },
        status: { type: "enum", values: ["trialing", "active", "past_due", "canceled"], required: true, default: "trialing" },
        currentPeriodEnd: { type: "datetime" },
      },
      stateMachine: {
        field: "status",
        initial: "trialing",
        transitions: [
          { from: "trialing", to: "active" },
          { from: "active", to: "past_due" },
          { from: "past_due", to: "active" },
          { from: "active", to: "canceled", roles: ["owner", "admin"] },
          { from: "past_due", to: "canceled", roles: ["owner", "admin"] },
        ],
      },
      timestamps: true,
    },
    {
      name: "Invoice",
      fields: {
        organizationId: { type: "uuid", required: true, index: true },
        number: { type: "string", required: true, unique: true, index: true },
        amount: { type: "decimal", required: true, min: 0 },
        status: { type: "enum", values: ["draft", "open", "paid", "void"], required: true, default: "draft" },
        issuedAt: { type: "datetime" },
      },
      stateMachine: {
        field: "status",
        initial: "draft",
        transitions: [
          { from: "draft", to: "open" },
          { from: "open", to: "paid" },
          { from: "open", to: "void", roles: ["owner", "admin"] },
        ],
      },
      timestamps: true,
    },
  ],
  permissions: [
    { resource: "Project", rules: [
      { role: "owner", actions: ["create", "read", "update", "delete"], scope: { column: "organizationId", claim: "org" } },
      { role: "admin", actions: ["create", "read", "update", "delete"], scope: { column: "organizationId", claim: "org" } },
      { role: "member", actions: ["read", "update"], scope: { column: "organizationId", claim: "org" } },
    ] },
    { resource: "Task", rules: [
      { role: "owner", actions: ["create", "read", "update", "delete"], scope: { column: "organizationId", claim: "org" } },
      { role: "admin", actions: ["create", "read", "update", "delete"], scope: { column: "organizationId", claim: "org" } },
      { role: "member", actions: ["create", "read", "update"], scope: { column: "organizationId", claim: "org" } },
    ] },
    { resource: "Invoice", rules: [
      { role: "owner", actions: ["read"], scope: { column: "organizationId", claim: "org" } },
      { role: "admin", actions: ["read"], scope: { column: "organizationId", claim: "org" } },
    ] },
  ],
};

export const OFFICIAL_TEMPLATES: OfficialTemplate[] = [
  { id: "tpl_official_blog_cms", title: "Blog / CMS", description: blogCms.description!, category: "Blog", emoji: "📝", spec: blogCms },
  { id: "tpl_official_ecommerce", title: "E-commerce", description: ecommerce.description!, category: "E-commerce", emoji: "🛒", spec: ecommerce },
  { id: "tpl_official_booking", title: "App de réservation", description: booking.description!, category: "Réservation", emoji: "📅", spec: booking },
  { id: "tpl_official_delivery", title: "App de livraison", description: delivery.description!, category: "Livraison", emoji: "🛵", spec: delivery },
  { id: "tpl_official_mobile_money", title: "Mobile Money / Paiements", description: mobileMoney.description!, category: "Paiements", emoji: "💸", spec: mobileMoney },
  { id: "tpl_official_social", title: "Réseau social", description: social.description!, category: "Social", emoji: "💬", spec: social },
  { id: "tpl_official_saas", title: "SaaS multi-tenant", description: saas.description!, category: "SaaS", emoji: "🏢", spec: saas },
];

/** All categories surfaced by the official templates (used for marketplace filters). */
export const OFFICIAL_CATEGORIES = Array.from(new Set(OFFICIAL_TEMPLATES.map((t) => t.category)));
