import React, { useState, useRef, useEffect } from 'react';
import jamesImg from './james.jpeg';
import { Upload, CheckCircle2, Plus, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ReceiptData, Assignment } from './types';
import { parseReceiptImage } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


// Compact share encoding — short keys + URL-safe base64
function encodeShareData(data: SharedReceiptData): string {
  const compact = {
    p: data.person,
    r: data.restaurant,
    d: data.date,
    c: data.currency,
    i: data.items.map(it => ({ n: it.name, s: it.share, x: it.splitCount })),
    st: data.subtotal,
    tx: data.tax,
    tp: data.tip,
    tt: data.total,
    it: data.itemsIncludeTax,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(compact))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeShareData(str: string): SharedReceiptData {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const d = JSON.parse(decodeURIComponent(escape(atob(padded))));
  return {
    person: d.p,
    restaurant: d.r,
    date: d.d,
    currency: d.c,
    items: d.i.map((it: any) => ({ name: it.n, share: it.s, splitCount: it.x })),
    subtotal: d.st,
    tax: d.tx,
    tip: d.tp,
    total: d.tt,
    itemsIncludeTax: d.it,
  };
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', USD: '$', GBP: '£', JPY: '¥', AUD: 'A$', CAD: 'C$',
  CHF: 'Fr', CNY: '¥', INR: '₹', KRW: '₩', BRL: 'R$', MXN: '$',
};

const SPLIT_WORDS: Record<number, string> = {
  2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight',
};

function splitLabel(count: number): string {
  return `split between ${SPLIT_WORDS[count] ?? count}`;
}

function formatCurrency(code: string): string {
  return CURRENCY_SYMBOLS[code?.toUpperCase()] ?? code ?? '$';
}


const JamesIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <img
    src={jamesImg}
    width={size}
    height={size}
    className={className}
    style={{ imageRendering: 'pixelated', objectFit: 'contain', mixBlendMode: 'multiply' }}
    alt="James"
  />
);

// Receipt-style perforated edge
const PerforatedEdge = ({ flip = false }: { flip?: boolean }) => (
  <div
    style={{
      height: '14px',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}
  >
    <svg width="100%" height="14" preserveAspectRatio="none">
      <defs>
        <pattern id={flip ? 'perf-flip' : 'perf'} x="0" y="0" width="20" height="14" patternUnits="userSpaceOnUse">
          <circle cx="10" cy={flip ? 14 : 0} r="7" fill="#E2E2E2" />
        </pattern>
      </defs>
      <rect width="100%" height="14" fill="#FAFAFA" />
      <rect width="100%" height="14" fill={`url(#${flip ? 'perf-flip' : 'perf'})`} />
    </svg>
  </div>
);

interface SharedReceiptData {
  person: string;
  restaurant?: string;
  date?: string;
  currency: string;
  items: { name: string; share: number; splitCount: number }[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  itemsIncludeTax: boolean;
}

const SharedReceiptView = ({ data }: { data: SharedReceiptData }) => {
  const rule = '#DCDCDC';
  const inkMid = '#484848';
  const inkLight = '#8C8C8C';

  return (
    <div style={{ background: '#E2E2E2', minHeight: '100vh', fontFamily: '"IBM Plex Mono", monospace' }}>
      <div style={{ background: '#FAFAFA', color: '#0A0A0A', maxWidth: '420px', margin: '0 auto', minHeight: '100vh', boxShadow: '0 0 60px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>
        <PerforatedEdge />
        <div style={{ padding: '28px 24px 20px', textAlign: 'center', borderBottom: `1px dashed ${rule}` }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <JamesIcon size={80} />
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: inkMid, marginBottom: '10px' }}>
            ★ JAMES ★ THE BILL SPLITTER ★
          </div>
          <div style={{ borderTop: `1px solid ${rule}`, borderBottom: `1px solid ${rule}`, padding: '8px 0', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: inkLight, marginBottom: '4px' }}>YOUR SHARE OF</div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#0A0A0A', margin: 0 }}>
              {data.restaurant || 'THE BILL'}
            </h1>
            {data.date && (
              <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: inkLight, marginTop: '6px' }}>
                {data.date}
              </div>
            )}
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: inkMid }}>
            HEY, {data.person.toUpperCase()}!
          </div>
        </div>
        <div style={{ padding: '20px 24px', flex: 1 }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.25em', color: inkMid, marginBottom: '10px' }}>
            ── YOUR ITEMS ────────────────────
          </div>
          {data.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: `1px dotted ${rule}`, fontSize: '12px' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px', textTransform: 'uppercase' }}>
                {item.name}
                {item.splitCount > 1 && (
                  <span style={{ fontSize: '9px', color: inkLight, fontStyle: 'italic', marginLeft: '6px', textTransform: 'lowercase' }}>({splitLabel(item.splitCount)})</span>
                )}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, fontWeight: 600 }}>
                {formatCurrency(data.currency)} {item.share.toFixed(2)}
              </span>
            </div>
          ))}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `2px solid #0A0A0A`, fontSize: '11px', color: inkMid }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span>SUBTOTAL {data.itemsIncludeTax && <span style={{ color: inkLight, fontSize: '9px' }}>(TAX INCL.)</span>}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.currency)} {data.subtotal.toFixed(2)}</span>
            </div>
            {!data.itemsIncludeTax && data.tax > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span>TAX</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.currency)} {data.tax.toFixed(2)}</span>
              </div>
            )}
            {data.tip > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                <span>TIP {data.subtotal > 0 ? `(${Math.round((data.tip / data.subtotal) * 100)}%)` : ''}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.currency)} {data.tip.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 4px', marginTop: '8px', borderTop: `2px solid #0A0A0A`, fontSize: '20px', fontWeight: 700, color: '#0A0A0A' }}>
              <span>TOTAL</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(data.currency)} {data.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '20px 24px', textAlign: 'center', borderTop: `1px dashed ${rule}` }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: inkLight, lineHeight: '1.8' }}>
            ★ THANK YOU ★ PLEASE COME AGAIN ★
          </div>
          <div style={{ marginTop: '16px' }}>
            <a
              href="https://buy.stripe.com/6oUbIUecKd1e2YU7z15wI00"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '8px 20px',
                fontSize: '9px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 700,
                fontFamily: '"IBM Plex Mono", monospace',
                border: `1px solid ${rule}`,
                background: 'transparent',
                color: inkLight,
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              ♥ TIP THE DEVELOPER
            </a>
          </div>
        </div>

        {/* ── Viral CTA ─────────────────────────────────────────────────── */}
        <div style={{
          background: '#0A0A0A',
          padding: '28px 24px 32px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#FAFAFA',
            letterSpacing: '0.02em',
            marginBottom: '10px',
            lineHeight: 1.3,
          }}>
            Not bad, right?
          </div>
          <div style={{
            fontSize: '11px',
            color: '#888888',
            letterSpacing: '0.05em',
            lineHeight: 1.7,
            marginBottom: '22px',
            maxWidth: '260px',
            margin: '0 auto 22px',
          }}>
            Whoever split this bill did it in seconds.<br />Next time, that could be you.
          </div>
          <a
            href={window.location.origin}
            style={{
              display: 'inline-block',
              padding: '11px 26px',
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontWeight: 700,
              fontFamily: '"IBM Plex Mono", monospace',
              background: '#0A0A0A',
              color: '#FAFAFA',
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
          >
            SPLIT YOUR NEXT BILL →
          </a>
          <div style={{
            marginTop: '16px',
            fontSize: '8px',
            letterSpacing: '0.25em',
            color: '#484848',
            textTransform: 'uppercase',
          }}>
            JAMES · FREE · NO SIGN-UP
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [tipRate, setTipRate] = useState<number>(0);
  const [customTipAmount, setCustomTipAmount] = useState<string>('');
  const [tipMode, setTipMode] = useState<'percentage' | 'amount'>('percentage');
  const [isTipPanelOpen, setIsTipPanelOpen] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [sharedReceiptData, setSharedReceiptData] = useState<SharedReceiptData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    if (shareParam) {
      try {
        setSharedReceiptData(decodeShareData(shareParam));
      } catch {}
    }
  }, []);

  const LOADING_MESSAGES = [
    'JAMES IS ON IT.',
    "HE'S READING THE RECEIPT.",
    "HE'S PICKING OUT THE ITEMS.",
    "HE'S CALCULATING THE BILL.",
    "HE'S DIVIDING IT UP.",
    "ALMOST THERE.",
    "JAMES DOESN'T MISS A LINE ITEM.",
  ];

  useEffect(() => {
    if (!isUploading) return;
    setLoadingMsgIndex(0);
    const interval = setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isUploading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const data = await parseReceiptImage(base64, file.type);
          setReceipt(data);
          setAssignments(data.items.map((item) => ({ itemId: item.id, people: [] })));
          const subtotal = data.items.reduce((acc, item) => acc + item.price, 0);
          if (subtotal > 0) setTipRate((data.tip / subtotal) * 100);
        } catch (err: any) {
          console.error(err);
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsUploading(false);
    }
  };

  const handleAddPerson = (e?: React.FormEvent) => {
    e?.preventDefault();
    const name = newPersonName.trim();
    if (!name || people.length >= 50) return;
    if (!people.includes(name)) {
      setPeople((prev) => [...prev, name]);
      if (!selectedPerson) setSelectedPerson(name);
    }
    setNewPersonName('');
  };

  const handleToggleAssignment = (itemId: string) => {
    if (!selectedPerson) return;
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.itemId === itemId) {
          const hasPerson = a.people.includes(selectedPerson);
          return {
            ...a,
            people: hasPerson
              ? a.people.filter((p) => p !== selectedPerson)
              : [...a.people, selectedPerson],
          };
        }
        return a;
      })
    );
  };

  const calculateTotals = () => {
    if (!receipt) return { personTotals: {} as Record<string, any>, unassigned: null };

    interface PersonBreakdown {
      subtotal: number;
      tax: number;
      tip: number;
      total: number;
      items: { name: string; share: number; splitCount: number }[];
    }

    const personTotals: Record<string, PersonBreakdown> = {};
    people.forEach((p) => (personTotals[p] = { subtotal: 0, tax: 0, tip: 0, total: 0, items: [] }));

    const overallSubtotal = receipt.items.reduce((acc, item) => acc + item.price, 0);
    let unassignedSubtotal = 0;
    const currentTaxAmount = receipt.tax;
    const currentTipAmount =
      tipMode === 'percentage'
        ? overallSubtotal * (tipRate / 100)
        : parseFloat(customTipAmount) || 0;

    receipt.items.forEach((item) => {
      const assignment = assignments.find((a) => a.itemId === item.id);
      if (assignment && assignment.people.length > 0) {
        const splitCount = assignment.people.length;
        const share = item.price / splitCount;
        assignment.people.forEach((p) => {
          personTotals[p].subtotal += share;
          personTotals[p].items.push({ name: item.name, share, splitCount });
        });
      } else {
        unassignedSubtotal += item.price;
      }
    });

    Object.keys(personTotals).forEach((p) => {
      const person = personTotals[p];
      if (overallSubtotal > 0) {
        const proportion = person.subtotal / overallSubtotal;
        person.tax = currentTaxAmount * proportion;
        person.tip = currentTipAmount * proportion;
      }
      person.total =
        person.subtotal + (receipt.itemsIncludeTax ? 0 : person.tax) + person.tip;
    });

    const unassignedBreakdown = {
      subtotal: unassignedSubtotal,
      tax: overallSubtotal > 0 ? (unassignedSubtotal / overallSubtotal) * currentTaxAmount : 0,
      tip: overallSubtotal > 0 ? (unassignedSubtotal / overallSubtotal) * currentTipAmount : 0,
      total: 0,
      items: [] as any[],
    };
    unassignedBreakdown.total =
      unassignedBreakdown.subtotal +
      (receipt.itemsIncludeTax ? 0 : unassignedBreakdown.tax) +
      unassignedBreakdown.tip;

    return {
      personTotals,
      unassigned: unassignedSubtotal > 0 ? unassignedBreakdown : null,
      calculatedTax: currentTaxAmount,
      calculatedTip: currentTipAmount,
      calculatedTotal:
        overallSubtotal + (receipt.itemsIncludeTax ? 0 : currentTaxAmount) + currentTipAmount,
    };
  };

  const { personTotals, unassigned, calculatedTax, calculatedTip, calculatedTotal } =
    calculateTotals();

  const handleShare = async (person: string, breakdown: any) => {
    const data: SharedReceiptData = {
      person,
      restaurant: receipt?.restaurantName,
      date: receipt?.date,
      currency: receipt?.currency || '$',
      items: breakdown.items,
      subtotal: breakdown.subtotal,
      tax: breakdown.tax,
      tip: breakdown.tip,
      total: breakdown.total,
      itemsIncludeTax: receipt?.itemsIncludeTax || false,
    };
    const url = `${window.location.origin}${window.location.pathname}?share=${encodeShareData(data)}`;
    const restaurantLine = receipt?.restaurantName ? ` at ${receipt.restaurantName}` : '';
    const itemLines = breakdown.items
      .map((item: any) => `  ${item.name}${item.splitCount > 1 ? ` (${splitLabel(item.splitCount)})` : ''}: ${formatCurrency(receipt?.currency ?? "")} ${item.share.toFixed(2)}`)
      .join('\n');
    const text = `Hey ${person}! Here's your share${restaurantLine}:\n\n${itemLines}\n\n  Subtotal: ${formatCurrency(receipt?.currency ?? "")} ${breakdown.subtotal.toFixed(2)}\n  Tax: ${formatCurrency(receipt?.currency ?? "")} ${breakdown.tax.toFixed(2)}\n  Tip: ${formatCurrency(receipt?.currency ?? "")} ${breakdown.tip.toFixed(2)}\n  ──────────────\n  TOTAL: ${formatCurrency(receipt?.currency ?? "")} ${breakdown.total.toFixed(2)}`;
    try {
      await navigator.share({ title: `${person}'s bill${restaurantLine}`, text, url });
    } catch {
      try { await navigator.clipboard.writeText(`${text}\n\n${url}`); } catch {}
    }
  };

  if (sharedReceiptData) return <SharedReceiptView data={sharedReceiptData} />;

  const unassignedItems =
    receipt?.items.filter((item) => {
      const a = assignments.find((as) => as.itemId === item.id);
      return !a || a.people.length === 0;
    }) || [];

  // ─── Styles ────────────────────────────────────────────────────────────────
  const paper: React.CSSProperties = {
    background: '#FAFAFA',
    fontFamily: '"IBM Plex Mono", monospace',
    color: '#0A0A0A',
  };

  const rule = '#DCDCDC';
  const inkMid = '#484848';
  const inkLight = '#8C8C8C';
  const amber = '#0A0A0A';

  return (
    <div style={{ background: '#E2E2E2', minHeight: '100vh', fontFamily: '"IBM Plex Mono", monospace' }}>
      {/* ── Loading overlay ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(250,250,250,0.96)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                style={{ mixBlendMode: 'multiply' }}
              >
                <JamesIcon size={80} className="mb-6" />
              </motion.div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  color: '#0A0A0A',
                  marginBottom: '8px',
                }}
              >
                READING RECEIPT
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={loadingMsgIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.35 }}
                  style={{ fontSize: '10px', letterSpacing: '0.2em', color: inkMid }}
                >
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </motion.div>
              </AnimatePresence>
              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '20px' }}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <motion.div
                    key={i}
                    style={{ width: '5px', height: '20px', background: amber }}
                    animate={{ opacity: [0.15, 1, 0.15] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.1 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Receipt paper ─────────────────────────────────────────────────── */}
      <div
        style={{
          ...paper,
          maxWidth: '420px',
          margin: '0 auto',
          minHeight: '100vh',
          boxShadow: '0 0 60px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PerforatedEdge />

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '28px 24px 20px',
            textAlign: 'center',
            borderBottom: `1px dashed ${rule}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <JamesIcon size={80} />
          </div>
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color: inkMid,
              marginBottom: receipt ? '10px' : 0,
            }}
          >
            ★ JAMES ★ THE BILL SPLITTER ★
          </div>
          {receipt && (
            <div
              style={{
                borderTop: `1px solid ${rule}`,
                borderBottom: `1px solid ${rule}`,
                padding: '8px 0',
                marginBottom: '16px',
                marginTop: '10px',
              }}
            >
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#0A0A0A',
                  margin: 0,
                }}
              >
                {receipt.restaurantName || 'RECEIPT'}
              </h1>
              {receipt.date && (
                <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: inkLight, marginTop: '6px' }}>
                  {receipt.date}
                </div>
              )}
            </div>
          )}
          {receipt && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{
                padding: '7px 16px',
                fontSize: '9px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 600,
                fontFamily: '"IBM Plex Mono", monospace',
                border: `1px solid ${rule}`,
                background: 'transparent',
                color: inkMid,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {isUploading ? '[ READING... ]' : '[ SCAN NEW RECEIPT ]'}
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept="image/*"
          />
        </div>

        <div style={{ padding: '0 24px', flex: 1 }}>
          {/* ── Splitters section ───────────────────────────────────────── */}
          {receipt && <div style={{
            margin: '0 -24px',
            padding: '20px 24px',
            background: '#F0F0F0',
            borderBottom: `1px solid ${rule}`,
          }}>
            <div
              style={{
                fontSize: '9px',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color: '#0A0A0A',
                fontWeight: 700,
                marginBottom: '14px',
              }}
            >
              ── WHO'S SPLITTING? ────────────
            </div>

            <form
              onSubmit={handleAddPerson}
              style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}
            >
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="Enter a name..."
                style={{
                  flex: 1,
                  padding: '9px 10px',
                  fontSize: '16px',
                  letterSpacing: '0.05em',
                  background: '#FAFAFA',
                  border: `1px solid ${rule}`,
                  borderRadius: '2px',
                  color: '#0A0A0A',
                  fontFamily: '"IBM Plex Mono", monospace',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!newPersonName.trim() || people.length >= 50}
                style={{
                  padding: '9px 18px',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  fontFamily: '"IBM Plex Mono", monospace',
                  border: 'none',
                  background: newPersonName.trim() && people.length < 50 ? '#0A0A0A' : rule,
                  color: newPersonName.trim() && people.length < 50 ? '#FAFAFA' : inkLight,
                  cursor: newPersonName.trim() && people.length < 50 ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                  borderRadius: '2px',
                  flexShrink: 0,
                }}
              >
                + ADD
              </button>
            </form>

            {people.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {people.map((person) => {
                  const isSelected = selectedPerson === person;
                  return (
                    <button
                      key={person}
                      onClick={() => setSelectedPerson(isSelected ? null : person)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '10px',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        fontFamily: '"IBM Plex Mono", monospace',
                        background: isSelected ? '#0A0A0A' : 'transparent',
                        color: isSelected ? '#FAFAFA' : '#0A0A0A',
                        border: `1.5px solid #0A0A0A`,
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isSelected && <span style={{ fontSize: '9px' }}>✓</span>}
                      {person}
                    </button>
                  );
                })}
              </div>
            )}

            <AnimatePresence mode="wait">
              {selectedPerson ? (
                <motion.p
                  key="selected"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{
                    marginTop: '12px',
                    fontSize: '9px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    color: amber,
                  }}
                >
                  ▸ TAP ITEMS BELOW TO ASSIGN {selectedPerson.toUpperCase()}
                </motion.p>
              ) : people.length > 0 ? (
                <motion.p
                  key="nudge"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  style={{
                    marginTop: '12px',
                    fontSize: '9px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: inkMid,
                  }}
                >
                  ▸ SELECT A NAME ABOVE, THEN TAP ITEMS BELOW
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>}

          {/* ── No receipt state ────────────────────────────────────────── */}
          {!receipt ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                <svg width="52" height="68" viewBox="0 0 40 54" fill="none">
                  <rect x="0" y="0" width="40" height="46" fill="#F0F0F0" rx="1"/>
                  <path d="M0 46 L5 53 L10 46 L15 53 L20 46 L25 53 L30 46 L35 53 L40 46 Z" fill="#F0F0F0"/>
                  <rect x="7" y="9"  width="26" height="2" fill={inkLight} rx="1"/>
                  <rect x="7" y="16" width="18" height="2" fill={inkLight} rx="1"/>
                  <rect x="7" y="23" width="22" height="2" fill={inkLight} rx="1"/>
                  <rect x="7" y="30" width="14" height="2" fill={inkLight} rx="1"/>
                  <rect x="7" y="37" width="26" height="2" fill={inkMid}   rx="1"/>
                </svg>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                  padding: '10px 28px',
                  fontSize: '10px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  fontFamily: '"IBM Plex Mono", monospace',
                  border: `1px solid #0A0A0A`,
                  background: '#0A0A0A',
                  color: '#FAFAFA',
                  cursor: 'pointer',
                }}
              >
                [ SCAN RECEIPT ]
              </button>
            </div>
          ) : (
            <>
              {/* ── Items ─────────────────────────────────────────────── */}
              <div style={{ padding: '20px 0', borderBottom: `1px dashed ${rule}` }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                      color: inkMid,
                    }}
                  >
                    ── ITEMS ────────────────────────
                  </div>
                  {unassignedItems.length > 0 && (
                    <span
                      style={{
                        fontSize: '9px',
                        letterSpacing: '0.15em',
                        color: amber,
                        fontWeight: 600,
                      }}
                    >
                      {unassignedItems.length} LEFT
                    </span>
                  )}
                </div>

                <div>
                  {receipt.items.map((item, index) => {
                    const assignment = assignments.find((a) => a.itemId === item.id);
                    const isAssigned = assignment && assignment.people.length > 0;
                    const isAssignedToSelected =
                      selectedPerson && assignment?.people.includes(selectedPerson);

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.035 }}
                        onClick={() => handleToggleAssignment(item.id)}
                        style={{
                          cursor: selectedPerson ? 'pointer' : 'default',
                          padding: '10px 0',
                          borderBottom: `1px dotted ${rule}`,
                          background: isAssignedToSelected
                            ? 'rgba(0,0,0,0.03)'
                            : 'transparent',
                          userSelect: 'none',
                        }}
                      >
                        {/* Item row */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: isAssignedToSelected ? 700 : 500,
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              paddingRight: '8px',
                              color: isAssigned && !isAssignedToSelected ? '#AEAEAE' : '#0A0A0A',
                            }}
                          >
                            {item.name.toUpperCase()}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: isAssignedToSelected ? 700 : 600,
                              flexShrink: 0,
                              fontVariantNumeric: 'tabular-nums',
                              color: isAssignedToSelected ? amber : isAssigned ? '#AEAEAE' : '#0A0A0A',
                            }}
                          >
                            {formatCurrency(receipt.currency)} {item.price.toFixed(2)}
                          </span>
                        </div>

                        {/* Person tags */}
                        {isAssigned && (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                              marginTop: '6px',
                            }}
                          >
                            <AnimatePresence mode="popLayout">
                              {assignment?.people.map((person) => (
                                <motion.span
                                  key={person}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.8, opacity: 0 }}
                                  style={{
                                    padding: '2px 8px',
                                    fontSize: '9px',
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                    fontWeight: 700,
                                    background: 'transparent',
                                    color: isAssigned && !isAssignedToSelected ? '#AEAEAE' : inkMid,
                                    border: `1px solid ${rule}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                  }}
                                >
                                  {person}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAssignments((prev) =>
                                        prev.map((a) =>
                                          a.itemId === item.id
                                            ? { ...a, people: a.people.filter((p) => p !== person) }
                                            : a
                                        )
                                      );
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: inkLight,
                                      cursor: 'pointer',
                                      padding: 0,
                                      fontSize: '11px',
                                      lineHeight: 1,
                                      fontFamily: '"IBM Plex Mono", monospace',
                                    }}
                                  >
                                    ×
                                  </button>
                                </motion.span>
                              ))}
                            </AnimatePresence>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ── Tip panel ───────────────────────────────────────── */}
              <div style={{ marginTop: '24px' }}>
                <button
                  onClick={() => setIsTipPanelOpen(!isTipPanelOpen)}
                  style={{
                    padding: '7px 16px',
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    fontFamily: '"IBM Plex Mono", monospace',
                    border: `1px solid ${amber}`,
                    background: isTipPanelOpen ? amber : 'transparent',
                    color: isTipPanelOpen ? '#FAFAFA' : amber,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {isTipPanelOpen
                    ? '[ CLOSE TIP ]'
                    : (tipMode === 'percentage' ? tipRate > 0 : parseFloat(customTipAmount) > 0)
                      ? '[ EDIT TIP ]'
                      : '[ + ADD TIP ]'}
                </button>

                <AnimatePresence>
                  {isTipPanelOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ paddingTop: '16px', paddingBottom: '4px' }}>
                        {/* Mode toggle */}
                        <div style={{ display: 'flex', marginBottom: '14px' }}>
                          {(['percentage', 'amount'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setTipMode(mode)}
                              style={{
                                flex: 1,
                                padding: '7px',
                                fontSize: '10px',
                                letterSpacing: '0.15em',
                                textTransform: 'uppercase',
                                fontWeight: 700,
                                fontFamily: '"IBM Plex Mono", monospace',
                                border: `1px solid #0A0A0A`,
                                background: tipMode === mode ? '#0A0A0A' : 'transparent',
                                color: tipMode === mode ? '#FAFAFA' : '#0A0A0A',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              {mode === 'percentage' ? 'PERCENT' : 'AMOUNT'}
                            </button>
                          ))}
                        </div>

                        {tipMode === 'percentage' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[10, 15, 18, 20, 25].map((rate) => (
                                <button
                                  key={rate}
                                  onClick={() => setTipRate(rate)}
                                  style={{
                                    flex: 1,
                                    padding: '7px 0',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    fontFamily: '"IBM Plex Mono", monospace',
                                    border: `1px solid #0A0A0A`,
                                    background: tipRate === rate ? '#0A0A0A' : 'transparent',
                                    color: tipRate === rate ? '#FAFAFA' : '#0A0A0A',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {rate}%
                                </button>
                              ))}
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="40"
                              step="1"
                              value={tipRate}
                              onChange={(e) => setTipRate(parseFloat(e.target.value))}
                              style={{ width: '100%', accentColor: '#0A0A0A', cursor: 'pointer' }}
                            />
                            <div
                              style={{
                                textAlign: 'center',
                                fontSize: '10px',
                                letterSpacing: '0.2em',
                                color: inkMid,
                              }}
                            >
                              CUSTOM: {tipRate}%
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              borderBottom: `1px solid ${rule}`,
                              paddingBottom: '4px',
                            }}
                          >
                            <span style={{ fontSize: '13px', color: inkMid, marginRight: '8px' }}>
                              {formatCurrency(receipt.currency)}
                            </span>
                            <input
                              type="number"
                              value={customTipAmount}
                              onChange={(e) => setCustomTipAmount(e.target.value)}
                              placeholder="0.00"
                              style={{
                                flex: 1,
                                padding: '6px 0',
                                fontSize: '13px',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#0A0A0A',
                                fontFamily: '"IBM Plex Mono", monospace',
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Grand total ──────────────────────────────────────── */}
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: `2px solid #0A0A0A` }}>
                <div style={{ fontSize: '11px', color: inkMid }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '3px 0',
                    }}
                  >
                    <span>
                      SUBTOTAL{' '}
                      {receipt.itemsIncludeTax && (
                        <span style={{ color: inkLight, fontSize: '9px' }}>(TAX INCL.)</span>
                      )}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(receipt.currency)}
                      {receipt.items.reduce((a, b) => a + b.price, 0).toFixed(2)}
                    </span>
                  </div>
                  {!receipt.itemsIncludeTax && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '3px 0',
                      }}
                    >
                      <span>TAX</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(receipt.currency)} {(calculatedTax ?? 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '3px 0',
                    }}
                  >
                    <span>
                      TIP {tipMode === 'percentage' ? `(${tipRate.toFixed(0)}%)` : ''}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(receipt.currency)} {(calculatedTip ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 0 4px',
                    marginTop: '8px',
                    borderTop: `2px solid #0A0A0A`,
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0A0A0A',
                    letterSpacing: '0.05em',
                  }}
                >
                  <span>TOTAL</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(receipt.currency)} {(calculatedTotal ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* ── Summary ───────────────────────────────────────────── */}
              <div style={{ padding: '20px 0', borderTop: '2px solid #0A0A0A', marginTop: '24px' }}>
                <div
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: inkMid,
                    marginBottom: '12px',
                  }}
                >
                  ── SUMMARY ──────────────────────
                </div>

                {/* Person cards grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                  {Object.entries(personTotals).map(([person, breakdown]) => {
                    const isExpanded = expandedPerson === person;
                    return (
                      <button
                        key={person}
                        onClick={() => setExpandedPerson(isExpanded ? null : person)}
                        style={{
                          width: 'calc(50% - 4px)',
                          padding: '12px',
                          background: isExpanded ? '#F0F0F0' : 'transparent',
                          border: `1px solid ${isExpanded ? '#0A0A0A' : rule}`,
                          cursor: 'pointer',
                          fontFamily: '"IBM Plex Mono", monospace',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <svg width="11" height="15" viewBox="0 0 11 15" fill="none" style={{ flexShrink: 0 }}>
                            <rect x="0" y="0" width="11" height="11" fill={isExpanded ? '#0A0A0A' : inkMid} rx="1"/>
                            <path d="M0 11 L1.375 14 L2.75 11 L4.125 14 L5.5 11 L6.875 14 L8.25 11 L9.625 14 L11 11 Z" fill={isExpanded ? '#0A0A0A' : inkMid}/>
                            <rect x="2" y="2.5" width="7" height="1" fill="#FAFAFA" rx="0.5"/>
                            <rect x="2" y="5" width="5" height="1" fill="#FAFAFA" rx="0.5"/>
                            <rect x="2" y="7.5" width="6" height="1" fill="#FAFAFA" rx="0.5"/>
                          </svg>
                          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isExpanded ? '#0A0A0A' : inkMid, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {person}
                          </span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#0A0A0A', letterSpacing: '0.02em' }}>
                          {formatCurrency(receipt.currency)} {breakdown.total.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Expanded mini receipt - full width below cards */}
                <AnimatePresence>
                  {expandedPerson && personTotals[expandedPerson] && (
                    <motion.div
                      key={expandedPerson}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ marginTop: '8px', border: `1px dashed ${rule}`, background: '#F0F0F0' }}>
                        {/* Header */}
                        <div style={{ padding: '8px 12px', borderBottom: `1px dashed ${rule}`, textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', letterSpacing: '0.2em', color: inkLight }}>YOUR SHARE</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', color: '#0A0A0A' }}>
                            {expandedPerson.toUpperCase()}
                          </div>
                        </div>
                        {/* Items */}
                        <div style={{ padding: '8px 12px', borderBottom: `1px dashed ${rule}` }}>
                          {personTotals[expandedPerson].items.map((item: { name: string; share: number; splitCount: number }, idx: number) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '10px', color: inkMid, padding: '3px 0' }}>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>
                                {item.name.toUpperCase()}
                                {item.splitCount > 1 && (
                                  <span style={{ fontSize: '9px', color: inkLight, fontStyle: 'italic', marginLeft: '6px', textTransform: 'lowercase' }}>({splitLabel(item.splitCount)})</span>
                                )}
                              </span>
                              <span style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                                {formatCurrency(receipt.currency)} {item.share.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {/* Totals */}
                        <div style={{ padding: '8px 12px', fontSize: '10px', color: inkMid, borderBottom: `1px dashed ${rule}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span>SUBTOTAL {receipt.itemsIncludeTax && <span style={{ color: inkLight }}>(TAX INCL.)</span>}</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(receipt.currency)} {personTotals[expandedPerson].subtotal.toFixed(2)}</span>
                          </div>
                          {!receipt.itemsIncludeTax && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                              <span>TAX</span>
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(receipt.currency)} {personTotals[expandedPerson].tax.toFixed(2)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span>TIP</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(receipt.currency)} {personTotals[expandedPerson].tip.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 2px', marginTop: '4px', borderTop: `1px solid #0A0A0A`, fontWeight: 700, fontSize: '12px', color: '#0A0A0A' }}>
                            <span>TOTAL</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(receipt.currency)} {personTotals[expandedPerson].total.toFixed(2)}</span>
                          </div>
                        </div>
                        {/* Share button */}
                        <div style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleShare(expandedPerson, personTotals[expandedPerson])}
                            style={{
                              width: '100%',
                              padding: '8px',
                              fontSize: '10px',
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              fontWeight: 700,
                              fontFamily: '"IBM Plex Mono", monospace',
                              background: '#0A0A0A',
                              color: '#FAFAFA',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            SHARE WITH {expandedPerson.toUpperCase()} ↗
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Unassigned */}
                {unassigned && (
                  <div style={{ marginTop: '12px', borderTop: `1px dotted ${rule}`, paddingTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: inkLight }}>
                        UNASSIGNED
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: inkLight }}>
                        {formatCurrency(receipt.currency)} {unassigned.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {people.length === 0 && !unassigned && (
                  <p style={{ fontSize: '10px', color: inkLight, padding: '16px 0' }}>
                    NO ASSIGNMENTS YET
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            textAlign: 'center',
            borderTop: `1px dashed ${rule}`,
          }}
        >
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: inkLight,
              lineHeight: '1.8',
            }}
          >
            ★ THANK YOU ★ PLEASE COME AGAIN ★
          </div>
          <div style={{ marginTop: '16px' }}>
            <a
              href="https://buy.stripe.com/6oUbIUecKd1e2YU7z15wI00"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '8px 20px',
                fontSize: '9px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                fontWeight: 700,
                fontFamily: '"IBM Plex Mono", monospace',
                border: `1px solid ${rule}`,
                background: 'transparent',
                color: inkLight,
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              ♥ TIP THE DEVELOPER
            </a>
          </div>
        </div>

        <PerforatedEdge flip />
      </div>
    </div>
  );
}
