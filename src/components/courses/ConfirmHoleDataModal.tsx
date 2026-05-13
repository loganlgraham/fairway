import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface ConfirmHoleRow {
  hole_number: number;
  par: number;
  hcp_rating: number;
  yards: number | null;
}

interface ConfirmHoleDataModalProps {
  open: boolean;
  numHoles: number;
  initial: Partial<ConfirmHoleRow>[]; // length = numHoles; missing values are blanks
  courseName: string;
  onCancel: () => void;
  onConfirm: (holes: ConfirmHoleRow[]) => void;
  saving?: boolean;
}

interface Draft {
  hole_number: number;
  par: string;
  hcp_rating: string;
  yards: string;
}

export function ConfirmHoleDataModal({
  open,
  numHoles,
  initial,
  courseName,
  onCancel,
  onConfirm,
  saving = false,
}: ConfirmHoleDataModalProps) {
  const [rows, setRows] = useState<Draft[]>([]);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    const shouldSeed = !wasOpenRef.current || rows.length !== numHoles;
    if (!shouldSeed) return;

    const seed: Draft[] = [];
    for (let i = 0; i < numHoles; i++) {
      const src = initial[i];
      seed.push({
        hole_number: i + 1,
        par: src?.par != null ? String(src.par) : "",
        hcp_rating: src?.hcp_rating != null ? String(src.hcp_rating) : "",
        yards: src?.yards != null ? String(src.yards) : "",
      });
    }
    setRows(seed);
    wasOpenRef.current = true;
  }, [open, initial, numHoles, rows.length]);

  const validation = useMemo(() => {
    const pars: number[] = [];
    const hcps: number[] = [];
    const invalidParHoles = new Set<number>();
    const invalidHcpHoles = new Set<number>();
    const hcpCounts = new Map<number, number>();
    rows.forEach((r) => {
      const par = Number(r.par);
      const hcp = Number(r.hcp_rating);
      if (!Number.isFinite(par) || par < 3 || par > 6) {
        invalidParHoles.add(r.hole_number);
      } else {
        pars.push(par);
      }
      if (!Number.isFinite(hcp) || hcp < 1 || hcp > 18) {
        invalidHcpHoles.add(r.hole_number);
      } else {
        hcps.push(hcp);
        hcpCounts.set(hcp, (hcpCounts.get(hcp) ?? 0) + 1);
      }
    });
    const invalidHoles = rows
      .map((r) => r.hole_number)
      .filter(
        (hole) => invalidParHoles.has(hole) || invalidHcpHoles.has(hole),
      );
    const uniqueHcps = new Set(hcps);
    const duplicateHcps = Array.from(hcpCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([hcp]) => hcp)
      .sort((a, b) => a - b);
    const allHcpsValid =
      hcps.length === rows.length && uniqueHcps.size === rows.length;
    return {
      ok:
        rows.length > 0 &&
        pars.length === rows.length &&
        allHcpsValid &&
        invalidHoles.length === 0,
      invalidHoles,
      invalidParHoles,
      invalidHcpHoles,
      duplicateHcps,
      hcpsValid: allHcpsValid,
    };
  }, [rows]);

  const update = (idx: number, key: keyof Draft, value: string) => {
    setRows((r) => {
      const next = r.slice();
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const handleConfirm = () => {
    if (!validation.ok) return;
    onConfirm(
      rows.map((r) => ({
        hole_number: r.hole_number,
        par: Number(r.par),
        hcp_rating: Number(r.hcp_rating),
        yards: r.yards === "" ? null : Number(r.yards),
      })),
    );
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Confirm hole data"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation.ok}
            loading={saving}
          >
            Save course
          </Button>
        </>
      }
    >
      <p className="text-sm text-charcoal-muted">
        Fill in any blanks for{" "}
        <span className="font-medium text-charcoal">{courseName}</span>. Par
        must be 3-6 and HCP rating must be 1-18 with no duplicates.
      </p>
      {!validation.ok ? (
        <p className="mt-2 text-xs text-red-800">
          {validation.duplicateHcps.length > 0
            ? `Each hole needs a unique HCP rating from 1-18. Duplicate values: ${validation.duplicateHcps.join(", ")}.`
            : `Fill valid Par and HCP for holes: ${validation.invalidHoles.join(", ")}.`}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-charcoal-muted">
              <th className="border-b border-line py-2 pr-3">Hole</th>
              <th className="border-b border-line py-2 pr-3">Par</th>
              <th className="border-b border-line py-2 pr-3">HCP</th>
              <th className="border-b border-line py-2 pr-3">Yards</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.hole_number}>
                <td className="border-b border-line py-1.5 pr-3 font-medium text-charcoal">
                  {r.hole_number}
                </td>
                <td className="border-b border-line py-1.5 pr-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={3}
                    max={6}
                    className={`input h-9 w-16 py-1 text-center ${
                      validation.invalidParHoles.has(r.hole_number)
                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                        : ""
                    }`}
                    value={r.par}
                    onChange={(e) => update(idx, "par", e.target.value)}
                  />
                </td>
                <td className="border-b border-line py-1.5 pr-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={18}
                    className={`input h-9 w-16 py-1 text-center ${
                      validation.invalidHcpHoles.has(r.hole_number)
                        ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                        : ""
                    }`}
                    value={r.hcp_rating}
                    onChange={(e) =>
                      update(idx, "hcp_rating", e.target.value)
                    }
                  />
                </td>
                <td className="border-b border-line py-1.5 pr-3">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="input h-9 w-20 py-1 text-center"
                    value={r.yards}
                    onChange={(e) => update(idx, "yards", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
