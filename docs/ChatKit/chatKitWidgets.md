ChatKit widgets
===============

Learn how to design widgets in your chat experience.

Widgets are the containers and components that come with ChatKit. You can use prebuilt widgets, modify templates, or design your own to fully customize ChatKit in your product.

![widgets](https://cdn.openai.com/API/images/widget-graphic.png)

Design widgets quickly
----------------------

Use the [Widget Builder](https://widgets.chatkit.studio) in ChatKit Studio to experiment with card layouts, list rows, and preview components. When you have a design you like, copy the generated JSON into your integration and serve it from your backend.

Upload assets
-------------

Upload assets to customize ChatKit widgets to match your product. ChatKit expects uploads (files and images) to be hosted by your backend before they are referenced in a message. Follow the [upload guide in the Python SDK](https://openai.github.io/chatkit-python/server) for a reference implementation.

ChatKit widgets can surface context, shortcuts, and interactive cards directly in the conversation. When a user clicks a widget button, your application receives a custom action payload so you can respond from your backend.

Handle actions on your server
-----------------------------

Widget actions allow users to trigger logic from the UI. Actions can be bound to different events on various widget nodes (e.g., button clicks) and then handled by your server or client integration.

Capture widget events with the `onAction` callback from `WidgetsOption` or equivalent React hook. Forward the action payload to your backend to handle actions.

```ts
chatkit.setOptions({
  widgets: {
    async onAction(action, item) {
      await fetch('/api/widget-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, itemId: item.id }),
      });
    },
  },
});
```

Looking for a full server example? See the [ChatKit Python SDK docs](https://openai.github.io/chatkit-python-sdk/guides/widget-actions) for an end-to-end walkthrough.

Learn more in the [actions docs](/docs/guides/chatkit-actions).

Reference
---------

We recommend getting started with the visual builders and tools above. Use the rest of this documentation to learn how widgets work and see all options.

Widgets are constructed with a single container (`WidgetRoot`), which contains many components (`WidgetNode`).

### Containers (`WidgetRoot`)

Containers have specific characteristics, like display status indicator text and primary actions.

*   **Card** - A bounded container for widgets. Supports `status`, `confirm` and `cancel` fields for presenting status indicators and action buttons below the widget.
    
    *   `children`: list\[WidgetNode\]
    *   `size`: "sm" | "md" | "lg" | "full" (default: "md")
    *   `padding`: float | str | dict\[str, float | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `background`: str | `{ dark: str, light: str }` | None
    *   `status`: `{ text: str, favicon?: str }` | `{ text: str, icon?: str }` | None
    *   `collapsed`: bool | None
    *   `asForm`: bool | None
    *   `confirm`: `{ label: str, action: ActionConfig }` | None
    *   `cancel`: `{ label: str, action: ActionConfig }` | None
    *   `theme`: "light" | "dark" | None
    *   `key`: str | None
*   **ListView** – Displays a vertical list of items, each as a `ListViewItem`.
    
    *   `children`: list\[ListViewItem\]
    *   `limit`: int | "auto" | None
    *   `status`: `{ text: str, favicon?: str }` | `{ text: str, icon?: str }` | None
    *   `theme`: "light" | "dark" | None
    *   `key`: str | None

### Components (`WidgetNode`)

The following widget types are supported. You can also browse components and use an interactive editor in the [components](https://widgets.chatkit.studio/components) section of the Widget Builder.

*   **Badge** – A small label for status or metadata.
    
    *   `label`: str
    *   `color`: "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | None
    *   `variant`: "solid" | "soft" | "outline" | None
    *   `pill`: bool | None
    *   `size`: "sm" | "md" | "lg" | None
    *   `key`: str | None
*   **Box** – A flexible container for layout, supports direction, spacing, and styling.
    
    *   `children`: list\[WidgetNode\] | None
    *   `direction`: "row" | "column" | None
    *   `align`: "start" | "center" | "end" | "baseline" | "stretch" | None
    *   `justify`: "start" | "center" | "end" | "stretch" | "between" | "around" | "evenly" | None
    *   `wrap`: "nowrap" | "wrap" | "wrap-reverse" | None
    *   `flex`: int | str | None
    *   `height`: float | str | None
    *   `width`: float | str | None
    *   `minHeight`: int | str | None
    *   `minWidth`: int | str | None
    *   `maxHeight`: int | str | None
    *   `maxWidth`: int | str | None
    *   `size`: float | str | None
    *   `minSize`: int | str | None
    *   `maxSize`: int | str | None
    *   `gap`: int | str | None
    *   `padding`: float | str | dict\[str, float | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `margin`: float | str | dict\[str, float | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `border`: int | `dict[str, Any]` | None (single border: `{ size: int, color?: str` | `{ dark: str, light: str }`, style?: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "inset" | "outset" } `per-side`: `{ top?: int|dict, right?: int|dict, bottom?: int|dict, left?: int|dict, x?: int|dict, y?: int|dict }`)
    *   `radius`: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full" | "100%" | "none" | None
    *   `background`: str | `{ dark: str, light: str }` | None
    *   `aspectRatio`: float | str | None
    *   `key`: str | None
*   **Row** – Arranges children horizontally.
    
    *   `children`: list\[WidgetNode\] | None
    *   `gap`: int | str | None
    *   `padding`: float | str | dict\[str, float | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `align`: "start" | "center" | "end" | "baseline" | "stretch" | None
    *   `justify`: "start" | "center" | "end" | "stretch" | "between" | "around" | "evenly" | None
    *   `flex`: int | str | None
    *   `height`: float | str | None
    *   `width`: float | str | None
    *   `minHeight`: int | str | None
    *   `minWidth`: int | str | None
    *   `maxHeight`: int | str | None
    *   `maxWidth`: int | str | None
    *   `size`: float | str | None
    *   `minSize`: int | str | None
    *   `maxSize`: int | str | None
    *   `margin`: float | str | dict\[str, float | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `border`: int | dict\[str, Any\] | None (single border: `{ size: int, color?: str | { dark: str, light: str }, style?: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "inset" | "outset" }` per-side: `{ top?: int|dict, right?: int|dict, bottom?: int|dict, left?: int|dict, x?: int|dict, y?: int|dict }`)
    *   `radius`: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full" | "100%" | "none" | None
    *   `background`: str | `{ dark: str, light: str }` | None
    *   `aspectRatio`: float | str | None
    *   `key`: str | None
*   **Col** – Arranges children vertically.
    
    *   `children`: list\[WidgetNode\] | None
    *   `gap`: int | str | None
    *   `padding`: float | str | dict\[str, float | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `align`: "start" | "center" | "end" | "baseline" | "stretch" | None
    *   `justify`: "start" | "center" | "end" | "stretch" | "between" | "around" | "evenly" | None
    *   `wrap`: "nowrap" | "wrap" | "wrap-reverse" | None
    *   `flex`: int | str | None
    *   `height`: float | str | None
    *   `width`: float | str | None
    *   `minHeight`: int | str | None
    *   `minWidth`: int | str | None
    *   `maxHeight`: int | str | None
    *   `maxWidth`: int | str | None
    *   `size`: float | str | None
    *   `minSize`: int | str | None
    *   `maxSize`: int | str | None
    *   `margin`: float | str | dict\[str, float | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `border`: int | dict\[str, Any\] | None (single border: `{ size: int, color?: str | { dark: str, light: str }, style?: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "inset" | "outset" }` per-side: `{ top?: int|dict, right?: int|dict, bottom?: int|dict, left?: int|dict, x?: int|dict, y?: int|dict }`)
    *   `radius`: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full" | "100%" | "none" | None
    *   `background`: str | `{ dark: str, light: str }` | None
    *   `aspectRatio`: float | str | None
    *   `key`: str | None
*   **Button** – A flexible action button.
    
    *   `submit`: bool | None
    *   `style`: "primary" | "secondary" | None
    *   `label`: str
    *   `onClickAction`: ActionConfig
    *   `iconStart`: str | None
    *   `iconEnd`: str | None
    *   `color`: "primary" | "secondary" | "info" | "discovery" | "success" | "caution" | "warning" | "danger" | None
    *   `variant`: "solid" | "soft" | "outline" | "ghost" | None
    *   `size`: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | None
    *   `pill`: bool | None
    *   `block`: bool | None
    *   `uniform`: bool | None
    *   `iconSize`: "sm" | "md" | "lg" | "xl" | "2xl" | None
    *   `key`: str | None
*   **Caption** – Smaller, supporting text.
    
    *   `value`: str
    *   `size`: "sm" | "md" | "lg" | None
    *   `weight`: "normal" | "medium" | "semibold" | "bold" | None
    *   `textAlign`: "start" | "center" | "end" | None
    *   `color`: str | `{ dark: str, light: str }` | None
    *   `truncate`: bool | None
    *   `maxLines`: int | None
    *   `key`: str | None
*   **DatePicker** – A date input with a dropdown calendar.
    
    *   `onChangeAction`: ActionConfig | None
    *   `name`: str
    *   `min`: datetime | None
    *   `max`: datetime | None
    *   `side`: "top" | "bottom" | "left" | "right" | None
    *   `align`: "start" | "center" | "end" | None
    *   `placeholder`: str | None
    *   `defaultValue`: datetime | None
    *   `variant`: "solid" | "soft" | "outline" | "ghost" | None
    *   `size`: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | None
    *   `pill`: bool | None
    *   `block`: bool | None
    *   `clearable`: bool | None
    *   `disabled`: bool | None
    *   `key`: str | None
*   **Divider** – A horizontal or vertical separator.
    
    *   `spacing`: int | str | None
    *   `color`: str | `{ dark: str, light: str }` | None
    *   `size`: int | str | None
    *   `flush`: bool | None
    *   `key`: str | None
*   **Icon** – Displays an icon by name.
    
    *   `name`: str
    *   `color`: str | `{ dark: str, light: str }` | None
    *   `size`: "xs" | "sm" | "md" | "lg" | "xl" | None
    *   `key`: str | None
*   **Image** – Displays an image with optional styling, fit, and position.
    
    *   `size`: int | str | None
    *   `height`: int | str | None
    *   `width`: int | str | None
    *   `minHeight`: int | str | None
    *   `minWidth`: int | str | None
    *   `maxHeight`: int | str | None
    *   `maxWidth`: int | str | None
    *   `minSize`: int | str | None
    *   `maxSize`: int | str | None
    *   `radius`: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full" | "100%" | "none" | None
    *   `background`: str | `{ dark: str, light: str }` | None
    *   `margin`: int | str | dict\[str, int | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `aspectRatio`: float | str | None
    *   `flex`: int | str | None
    *   `src`: str
    *   `alt`: str | None
    *   `fit`: "none" | "cover" | "contain" | "fill" | "scale-down" | None
    *   `position`: "center" | "top" | "bottom" | "left" | "right" | "top left" | "top right" | "bottom left" | "bottom right" | None
    *   `frame`: bool | None
    *   `flush`: bool | None
    *   `key`: str | None
*   **ListView** – Displays a vertical list of items.
    
    *   `children`: list\[ListViewItem\] | None
    *   `limit`: int | "auto" | None
    *   `status`: dict\[str, Any\] | None (shape: `{ text: str, favicon?: str }`)
    *   `theme`: "light" | "dark" | None
    *   `key`: str | None
*   **ListViewItem** – An item in a `ListView` with optional action.
    
    *   `children`: list\[WidgetNode\] | None
    *   `onClickAction`: ActionConfig | None
    *   `gap`: int | str | None
    *   `align`: "start" | "center" | "end" | "baseline" | "stretch" | None
    *   `key`: str | None
*   **Markdown** – Renders markdown-formatted text, supports streaming updates.
    
    *   `value`: str
    *   `streaming`: bool | None
    *   `key`: str | None
*   **Select** – A dropdown single-select input.
    
    *   `options`: list\[dict\[str, str\]\] (each option: `{ label: str, value: str }`)
    *   `onChangeAction`: ActionConfig | None
    *   `name`: str
    *   `placeholder`: str | None
    *   `defaultValue`: str | None
    *   `variant`: "solid" | "soft" | "outline" | "ghost" | None
    *   `size`: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | None
    *   `pill`: bool | None
    *   `block`: bool | None
    *   `clearable`: bool | None
    *   `disabled`: bool | None
    *   `key`: str | None
*   **Spacer** – Flexible empty space used in layouts.
    
    *   `minSize`: int | str | None
    *   `key`: str | None
*   **Text** – Displays plain text (use `Markdown` for markdown rendering). Supports streaming updates.
    
    *   `value`: str
    *   `color`: str | `{ dark: str, light: str }` | None
    *   `width`: float | str | None
    *   `size`: "xs" | "sm" | "md" | "lg" | "xl" | None
    *   `weight`: "normal" | "medium" | "semibold" | "bold" | None
    *   `textAlign`: "start" | "center" | "end" | None
    *   `italic`: bool | None
    *   `lineThrough`: bool | None
    *   `truncate`: bool | None
    *   `minLines`: int | None
    *   `maxLines`: int | None
    *   `streaming`: bool | None
    *   `editable`: bool | dict\[str, Any\] | None (when dict: `{ name: str, autoComplete?: str, autoFocus?: bool, autoSelect?: bool, allowAutofillExtensions?: bool, required?: bool, placeholder?: str, pattern?: str }`)
    *   `key`: str | None
*   **Title** – Prominent heading text.
    
    *   `value`: str
    *   `size`: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | None
    *   `weight`: "normal" | "medium" | "semibold" | "bold" | None
    *   `textAlign`: "start" | "center" | "end" | None
    *   `color`: str | `{ dark: str, light: str }` | None
    *   `truncate`: bool | None
    *   `maxLines`: int | None
    *   `key`: str | None
*   **Form** – A layout container that can submit an action.
    
    *   `onSubmitAction`: ActionConfig
    *   `children`: list\[WidgetNode\] | None
    *   `align`: "start" | "center" | "end" | "baseline" | "stretch" | None
    *   `justify`: "start" | "center" | "end" | "stretch" | "between" | "around" | "evenly" | None
    *   `flex`: int | str | None
    *   `gap`: int | str | None
    *   `height`: float | str | None
    *   `width`: float | str | None
    *   `minHeight`: int | str | None
    *   `minWidth`: int | str | None
    *   `maxHeight`: int | str | None
    *   `maxWidth`: int | str | None
    *   `size`: float | str | None
    *   `minSize`: int | str | None
    *   `maxSize`: int | str | None
    *   `padding`: float | str | dict\[str, float | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `margin`: float | str | dict\[str, float | str\] | None (keys: `top`, `right`, `bottom`, `left`, `x`, `y`)
    *   `border`: int | dict\[str, Any\] | None (single border: `{ size: int, color?: str | { dark: str, light: str }, style?: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "inset" | "outset" }` per-side: `{ top?: int|dict, right?: int|dict, bottom?: int|dict, left?: int|dict, x?: int|dict, y?: int|dict }`)
    *   `radius`: "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full" | "100%" | "none" | None
    *   `background`: str | `{ dark: str, light: str }` | None
    *   `key`: str | None
*   **Transition** – Wraps content that may animate.
    
    *   `children`: WidgetNode | None
    *   `key`: str | None