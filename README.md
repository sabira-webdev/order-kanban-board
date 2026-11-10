# Order Kanban Board for WooCommerce

A drag-and-drop board for WooCommerce orders. Each column is an order status (On hold → Processing → Packing → Ready to ship → Completed by default), and moving a card changes the order's status. The card moves on screen straight away, the server saves the change in the background, and you can undo it. The board also has a quick-view panel with line items, address and order notes, search, auto-refresh, and settings for which columns appear. It runs inside wp-admin on WooCommerce's own CRUD API and works with both High-Performance Order Storage (HPOS) and legacy post storage.

![Order board with five status columns](docs/screenshot-board.png)

![Dragging an order to Packing, then undoing the move](docs/demo.gif)

## Features

- **Drag-and-drop status changes** with mouse, touch or keyboard (focus the grip, Space to pick up, arrow keys to move, Space to drop).
- **Optimistic updates with Undo**: the card moves at once, and a snackbar offers Undo after the save.
- **Conflict detection**: if someone else changed the order first, the board shows the real status instead of overwriting it.
- **Confirmation for risky moves**: moving to Cancelled, Refunded or Failed asks first.
- **Quick-view panel**: line items, totals, shipping address, customer details and order notes. You can add private notes or notes to the customer without leaving the board.
- **Search** by order number, customer name or email.
- **Auto-refresh** every 30 seconds to 5 minutes, only while the tab is visible. It is skipped while a move is saving, while searching, or after "Show more".
- **"Show more" pagination** per column.
- **Two extra statuses**, *Packing* and *Ready to ship*, which also appear in WooCommerce's order list bulk actions.
- **Board settings**: choose and reorder up to 8 columns, orders per column, and how often the board checks for new orders.
- **Translation-ready**, with all strings in the `order-kanban-board` text domain.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend | PHP 7.4+, WordPress 6.6+ REST API, WooCommerce 8.0+ CRUD (`wc_get_orders`, `WC_Order`) |
| Frontend | React 18 (via `@wordpress/element`), `@wordpress/components`, `@wordpress/api-fetch` |
| Drag and drop | [dnd-kit](https://dndkit.com/) (`@dnd-kit/core`) |
| Build | `@wordpress/scripts` (webpack, Babel, Sass) |
| Tests | Vitest via `wp-scripts test-unit-js` |
| Code quality | ESLint and Stylelint (WordPress configs), PHP_CodeSniffer with WordPress Coding Standards |

## How it works

```
┌──────────────────────┐   apiFetch (nonce)   ┌──────────────────────┐   CRUD   ┌──────────────────────┐
│  React app           │ ───────────────────▶ │  REST API  okb/v1    │ ───────▶ │  WooCommerce         │
│  useReducer store    │ ◀─────────────────── │  Rest_Controller     │ ◀─────── │  wc_get_orders()     │
│  dnd-kit board       │      JSON cards      │  Board_Data          │          │  WC_Order (HPOS/CPT) │
└──────────────────────┘                      └──────────────────────┘          └──────────────────────┘
```

**Normalized state with `useReducer`.** Orders are stored once, by ID, and each column only holds a list of IDs. Moving a card means moving one ID from one list to another. The reducer ([`src/store/boardReducer.js`](src/store/boardReducer.js)) is a pure function, so it is easy to unit test.

**Optimistic updates with undo.** On drop, the reducer moves the card first and then sends the request. If saving fails, the same `MOVE` action runs again with `from` and `to` swapped, which puts the card back. Undo uses the same request in reverse.

**Conflict detection with `from`.** Every status change sends the status the browser *thinks* the order has (`from`). If the order's real status is different, for example because a colleague just moved it, the server responds with **409 Conflict** and the current order. The board then shows that order where it actually is, instead of silently overwriting the other person's change.

**HPOS compatibility.** All reads and writes go through WooCommerce's CRUD layer (`wc_get_orders`, `wc_get_order`, `$order->update_status()`), never through `WP_Query` or direct SQL. The plugin declares `custom_order_tables` compatibility, and links point to the right order screen for either storage mode.

**Scripts loaded only on the board page.** JavaScript and CSS are enqueued only on the board's own admin screen (checked against its hook suffix). WordPress packages such as React and `@wordpress/components` are not bundled; they are loaded as dependencies from WordPress core.

## REST API

All routes are under `/wp-json/okb/v1` and need a logged-in user with a valid REST nonce.

| Method | Route | Capability | Description |
| --- | --- | --- | --- |
| `GET` | `/board` | `edit_shop_orders` | All columns with their first page of orders. With `?search=`, returns matching orders instead (max 100). |
| `GET` | `/columns/{status}/orders` | `edit_shop_orders` | One more page of a column (`?page=N`). |
| `GET` | `/orders/{id}` | `edit_shop_orders` | Full details for the quick-view panel. |
| `POST` | `/orders/{id}/status` | `edit_shop_orders` | Change the status. Body: `status`, `from`. Returns **409** if `from` is out of date. |
| `POST` | `/orders/{id}/notes` | `edit_shop_orders` | Add an order note. Body: `note`, `to_customer`. |
| `GET` | `/settings` | `edit_shop_orders` | Current board settings. |
| `POST` | `/settings` | `manage_woocommerce` | Update board settings (`columns`, `per_column`, `poll_seconds`, `confirm_statuses`). |

## Project structure

```
order-kanban-board/
├── order-kanban-board.php      Plugin header, bootstrap, HPOS declaration
├── uninstall.php               Deletes the plugin's settings (never orders)
├── includes/
│   ├── class-settings.php      Settings option, validation, status colors
│   ├── class-order-statuses.php  Packing / Ready to ship statuses
│   ├── class-board-data.php    Loads orders and shapes card/detail JSON
│   ├── class-rest-controller.php  okb/v1 routes and permission checks
│   └── class-admin-page.php    Admin menu page and script loading
├── src/
│   ├── index.js                Entry point
│   ├── App.js                  Top-level state, moves, notices, modals
│   ├── board.scss              Styles
│   ├── components/             Board, Column, OrderCard, OrderPanel, Header,
│   │                           SettingsModal, ConfirmMoveModal
│   ├── hooks/                  useBoard, useOrderDetails, usePolling,
│   │                           useDebouncedValue
│   ├── store/                  boardReducer (+ test/)
│   └── utils/                  timeAgo (+ test/)
├── languages/                  Translation files
├── phpcs.xml.dist              PHP_CodeSniffer rules
└── package.json
```

## Installation

**From a zip**

1. Download `order-kanban-board.zip` from the [Releases](https://github.com/sabira-webdev/order-kanban-board/releases) page, or build it yourself with `npm run plugin-zip`.
2. In WordPress, go to **Plugins → Add New Plugin → Upload Plugin** and upload the zip.
3. Activate the plugin. WooCommerce must be active.
4. Open **WooCommerce → Order Board**.

**From source**

```bash
cd wp-content/plugins
git clone https://github.com/sabira-webdev/order-kanban-board.git
cd order-kanban-board
npm install
npm run build
```

Then activate **Order Kanban Board for WooCommerce** on the Plugins screen.

## Development

| Command | What it does |
| --- | --- |
| `npm start` | Build in watch mode while developing |
| `npm run build` | Production build into `build/` |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint:js` | Lint JavaScript |
| `npm run lint:css` | Lint SCSS |
| `npm run format` | Format JavaScript with Prettier |
| `npm run plugin-zip` | Create an installable `order-kanban-board.zip` |
| `phpcs` | Check PHP against WordPress Coding Standards (uses `phpcs.xml.dist`) |

## Before uninstalling

Deleting the plugin removes only its settings. It never changes or deletes orders.

However, **Packing** and **Ready to ship** are statuses registered by this plugin. Orders that still have one of these statuses keep it in the database, but WooCommerce won't recognize it once the plugin is gone, so those orders can be hard to find. **Move them to another status (for example Processing or Completed) before you deactivate the plugin.**

## Roadmap

- Bulk drag: select several cards and move them together
- Assign orders to team members
- Filters by shipping method and date

## License

[GPL-3.0-or-later](LICENSE) © Sabira K
