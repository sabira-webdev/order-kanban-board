=== Order Kanban Board for WooCommerce ===
Contributors: sabirak
Tags: woocommerce, orders, kanban, order status, fulfillment
Requires at least: 6.6
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Manage WooCommerce orders on a drag-and-drop board. Drag an order to a new column to change its status.

== Description ==

Order Kanban Board shows your WooCommerce orders as cards in columns, one column per order status. Drag a card to another column to change the order's status. The card moves straight away, and you can undo the change from the message that appears.

It is made for shops that pack and ship orders by hand and want to see at a glance what is waiting, what is being packed and what is ready to go.

= Features =

* Drag and drop orders between statuses, with mouse, touch or keyboard.
* Undo any move from the notice at the bottom of the screen.
* If a colleague changed an order first, the board shows the real status instead of overwriting their change.
* Moving an order to Cancelled, Refunded or Failed asks for confirmation first.
* Quick view: open a card to see items, totals, the shipping address, customer details and order notes, and add a note.
* Search by order number, customer name or email.
* The board checks for new orders automatically (every 30 seconds to 5 minutes, or never), only while the tab is open.
* "Show more" button to load older orders in a column.
* Two new statuses: Packing and Ready to ship. They are also available as bulk actions in the WooCommerce order list.
* Settings: choose which statuses appear as columns and in what order, and how many orders each column loads.
* Compatible with High-Performance Order Storage (HPOS).
* Translation-ready.

== Installation ==

1. Make sure WooCommerce 8.0 or newer is installed and active.
2. Go to Plugins → Add New Plugin → Upload Plugin, and upload `order-kanban-board.zip`.
3. Activate the plugin.
4. Open WooCommerce → Order Board.
5. Optional: click the gear icon on the board to choose the columns and refresh interval.

== Frequently Asked Questions ==

= Does moving an order send emails to the customer? =

It can. Changing a status on the board works exactly like changing it on the order screen, so WooCommerce sends the same emails it normally would (for example "Completed order"). Moving an order to Packing or Ready to ship does not send an email. Notes marked "Send to customer by email" are emailed to the customer.

= Does moving an order to Refunded or Cancelled refund the payment? =

No. The board only changes the order status. To refund a payment, use the Refund button on the order screen in WooCommerce. That's why the board asks for confirmation before moving an order to Cancelled, Refunded or Failed.

= Who can use the board? =

Anyone who can edit orders, which by default means Shop Managers and Administrators (the `edit_shop_orders` capability). Only users who can manage WooCommerce (`manage_woocommerce`) can change the board settings.

= What happens when I uninstall the plugin? =

Deleting the plugin removes only its settings. Orders are never changed or deleted. However, orders that still have the Packing or Ready to ship status keep it, and WooCommerce won't recognize those statuses once the plugin is removed. Move those orders to another status (for example Processing or Completed) before you deactivate the plugin.

== Screenshots ==

1. The order board with five status columns.
2. The quick-view panel with items, address and order notes.
3. Board settings: choose and reorder columns.
4. Confirmation before moving an order to Cancelled.

== Changelog ==

= 1.0.0 =
* First stable release.
* Drag-and-drop board with optimistic updates, undo and conflict detection.
* Quick-view panel with order notes.
* Search, auto-refresh and "Show more" pagination.
* Board settings and confirmation for risky status changes.
* Packing and Ready to ship order statuses.
