import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

/**
 * PUBLIC_INTERFACE
 * App
 * A single-page landing app to:
 * - Fetch and display menu items from the backend
 * - Manage a cart
 * - Collect customer info and submit an order for next-day delivery
 * Environment:
 * - Uses REACT_APP_BACKEND_URL or falls back to origin-relative paths.
 */
function App() {
  const [theme, setTheme] = useState('light');
  const [menu, setMenu] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [cart, setCart] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });

  // Apply theme to html
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Backend URL resolution from env
  const backendBase = useMemo(() => {
    const envUrl =
      process.env.REACT_APP_API_BASE ||
      process.env.REACT_APP_BACKEND_URL ||
      '';
    // ensure no trailing slash for consistency
    const normalized = envUrl ? envUrl.replace(/\/+$/, '') : '';
    return normalized || '';
  }, []);

  // Fetch menu on mount
  useEffect(() => {
    async function loadMenu() {
      setLoadingMenu(true);
      setMenuError('');
      try {
        const url = `${backendBase || ''}/api/menu`;
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) {
          throw new Error(`Menu request failed (${res.status})`);
        }
        const data = await res.json();
        // Expecting array of { id, name, description, price }
        setMenu(Array.isArray(data) ? data : (data.items || []));
      } catch (e) {
        setMenuError('Unable to load menu. Please try again later.');
        // Fallback demo items to keep UI functional
        setMenu([
          { id: 'demo-1', name: 'Fresh Garden Salad', description: 'Crisp greens with vinaigrette.', price: 7.5 },
          { id: 'demo-2', name: 'Grilled Chicken Bowl', description: 'Served with brown rice.', price: 12.0 },
          { id: 'demo-3', name: 'Pasta Primavera', description: 'Seasonal vegetables & herbs.', price: 10.5 },
          { id: 'demo-4', name: 'Tomato Basil Soup', description: 'Comfort in a bowl.', price: 6.0 },
          { id: 'demo-5', name: 'Veggie Wrap', description: 'Whole grain tortilla & hummus.', price: 8.0 },
          { id: 'demo-6', name: 'Roasted Salmon', description: 'Lemon butter sauce.', price: 15.0 },
        ]);
      } finally {
        setLoadingMenu(false);
      }
    }
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendBase]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  // PUBLIC_INTERFACE
  function setQty(itemId, qty) {
    /** Adjust quantity for a menu item in cart. */
    setCart(prev => {
      const next = { ...prev };
      const n = Math.max(0, isNaN(qty) ? 0 : Number(qty));
      if (n <= 0) delete next[itemId];
      else next[itemId] = n;
      return next;
    });
  }

  // PUBLIC_INTERFACE
  function increment(itemId) {
    /** Increase item qty by 1. */
    setCart(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
  }

  // PUBLIC_INTERFACE
  function decrement(itemId) {
    /** Decrease item qty by 1 (not below 0). */
    setCart(prev => {
      const current = prev[itemId] || 0;
      const nextCount = Math.max(0, current - 1);
      const next = { ...prev };
      if (nextCount === 0) delete next[itemId];
      else next[itemId] = nextCount;
      return next;
    });
  }

  const itemsInCart = useMemo(() => {
    return menu
      .filter(m => cart[m.id] > 0)
      .map(m => ({ ...m, qty: cart[m.id], lineTotal: (cart[m.id] || 0) * Number(m.price || 0) }));
  }, [cart, menu]);

  const subtotal = useMemo(() => {
    return itemsInCart.reduce((sum, it) => sum + it.lineTotal, 0);
  }, [itemsInCart]);

  // PUBLIC_INTERFACE
  async function submitOrder(e) {
    /**
     * Submit current order to backend API.
     * Payload:
     *  {
     *    customer: { name, phone, address, notes },
     *    items: [{ id, qty }],
     *    requested_delivery: "next-day"
     *  }
     */
    e.preventDefault();
    setSubmitError('');
    setSubmitMsg('');
    if (itemsInCart.length === 0) {
      setSubmitError('Add at least one item to your order.');
      return;
    }
    if (!customer.name || !customer.phone || !customer.address) {
      setSubmitError('Please provide your name, phone, and address.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          notes: customer.notes.trim(),
        },
        items: itemsInCart.map(it => ({ id: it.id, qty: it.qty })),
        requested_delivery: 'next-day',
      };
      const url = `${backendBase || ''}/api/orders`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Order submission failed (${res.status})`);
      }
      const data = await res.json().catch(() => ({}));
      setSubmitMsg(data.message || 'Order received! We will deliver it next day.');
      setCart({});
      setCustomer({ name: '', phone: '', address: '', notes: '' });
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit order.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="App">
      {/* Nav */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            <div className="brand-badge">ND</div>
            Next-Day Delivery
          </div>
          <div className="spacer" />
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="card">
          <div className="card-inner">
            <h1 className="hero-title">Fresh meals, delivered tomorrow</h1>
            <p className="hero-sub">
              Choose from today&apos;s menu and place your order before 8 PM. We&apos;ll deliver it the next day.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-inner cart-summary" aria-live="polite">
            <h3 style={{ marginTop: 0 }}>Your Order</h3>
            {itemsInCart.length === 0 ? (
              <p className="helper">Your cart is empty. Add items from the menu.</p>
            ) : (
              <>
                {itemsInCart.map(it => (
                  <div key={it.id} className="cart-row">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>{it.name}</strong>
                      <span className="helper">
                        {it.qty} × ${Number(it.price).toFixed(2)}
                      </span>
                    </div>
                    <div><strong>${it.lineTotal.toFixed(2)}</strong></div>
                  </div>
                ))}
                <div className="total">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Menu */}
      <section className="menu">
        <div className="card">
          <div className="card-inner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h3 style={{ margin: 0 }}>Today&apos;s Menu</h3>
              {loadingMenu && <span className="helper">Loading menu…</span>}
            </div>
            {menuError && <p className="error" role="alert">{menuError}</p>}
            <div className="menu-grid" role="list">
              {menu.map(item => (
                <div key={item.id} className="menu-item card" role="listitem">
                  <div className="card-inner">
                    <h4>{item.name}</h4>
                    {item.description && <p className="helper" style={{ margin: '4px 0 10px' }}>{item.description}</p>}
                    <div className="price">${Number(item.price || 0).toFixed(2)}</div>
                    <div className="qty-row" aria-label={`Quantity selector for ${item.name}`}>
                      <button className="btn ghost" onClick={() => decrement(item.id)} aria-label={`Decrease ${item.name}`}>
                        −
                      </button>
                      <input
                        className="qty-input"
                        type="number"
                        min="0"
                        value={cart[item.id] || 0}
                        onChange={(e) => setQty(item.id, e.target.value)}
                        aria-label={`Quantity of ${item.name}`}
                      />
                      <button className="btn secondary" onClick={() => increment(item.id)} aria-label={`Increase ${item.name}`}>
                        +
                      </button>
                      <div style={{ flex: 1 }} />
                      <button className="btn" onClick={() => increment(item.id)} aria-label={`Add ${item.name} to order`}>
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {menu.length === 0 && !loadingMenu && !menuError && (
                <p className="helper">No items available right now.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Order form */}
      <section className="menu" aria-labelledby="order-form-title">
        <div className="card">
          <div className="card-inner">
            <h3 id="order-form-title" style={{ marginTop: 0 }}>Your Details</h3>
            <form className="form" onSubmit={submitOrder}>
              <div>
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  className="input"
                  type="text"
                  placeholder="Jane Doe"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  className="input"
                  type="tel"
                  placeholder="+1 555 123 4567"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="address">Delivery address</label>
                <input
                  id="address"
                  className="input"
                  type="text"
                  placeholder="123 Main St, City"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  required
                />
                <div className="helper">Delivery scheduled for next day.</div>
              </div>
              <div>
                <label htmlFor="notes">Notes (optional)</label>
                <input
                  id="notes"
                  className="input"
                  type="text"
                  placeholder="Allergies, gate code, etc."
                  value={customer.notes}
                  onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                />
              </div>

              {submitError && <div className="error" role="alert">{submitError}</div>}
              {submitMsg && <div className="helper" role="status">{submitMsg}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? 'Placing order…' : 'Place order'}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setCart({});
                    setSubmitError('');
                    setSubmitMsg('');
                  }}
                >
                  Clear cart
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div>
          © {new Date().getFullYear()} Next‑Day Delivery — Crafted with care. Contact: orders@example.com
        </div>
      </footer>
    </div>
  );
}

export default App;
