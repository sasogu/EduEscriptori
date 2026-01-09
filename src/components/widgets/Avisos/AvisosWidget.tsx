import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, Settings, Play, Pause, RotateCcw, History } from 'lucide-react';
import type { WidgetConfig } from '../../../types';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { withBaseUrl } from '../../../utils/assetPaths';
import './AvisosWidget.css';

type StudentEventType = 'neg' | 'pos';

interface StudentEvent {
    ts: number;
    type: StudentEventType;
    delta: number;
}

interface Student {
    id: string;
    name: string;
    count: number;
    positiveCount: number;
    negSpentMs: number;
    history: StudentEvent[];
}

interface ClassData {
    name: string;
    students: Student[];
}

interface UiState {
    selectedClassId: string;
    minCountByClass: Record<string, number>;
    minPositiveByClass: Record<string, number>;
    timerRunning: boolean;
    timerFrozenAt: number;
    lastTickNow: number;
    negMinutesPerPoint: number;
    posMinutesPerPoint: number;
}

interface AppState {
    classes: Record<string, ClassData>;
    ui: UiState;
}

const APP_KEY = 'eduavisos_v1';
const DEFAULT_NEG_MINUTES_PER_POINT = 5;
const DEFAULT_POS_MINUTES_PER_POINT = 5;

const uid = (): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const defaultState = (): AppState => {
    const classes: Record<string, ClassData> = {};
    for (let i = 1; i <= 12; i++) {
        const id = `clase_${String(i).padStart(2, '0')}`;
        classes[id] = { name: `Clase ${i}`, students: [] };
    }
    const firstId = Object.keys(classes)[0] ?? 'clase_01';
    const now = Date.now();
    return {
        classes,
        ui: {
            selectedClassId: firstId,
            minCountByClass: {},
            minPositiveByClass: {},
            timerRunning: false,
            timerFrozenAt: now,
            lastTickNow: now,
            negMinutesPerPoint: DEFAULT_NEG_MINUTES_PER_POINT,
            posMinutesPerPoint: DEFAULT_POS_MINUTES_PER_POINT,
        },
    };
};

const clampMinutes = (value: unknown, fallback: number): number => {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < 0) return fallback;
    return n;
};

const migrateState = (raw: unknown): { state: AppState; changed: boolean } => {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return { state: base, changed: true };

    const r = raw as Partial<AppState>;
    const classes = r.classes && typeof r.classes === 'object' ? (r.classes as Record<string, ClassData>) : base.classes;

    const now = Date.now();
    const uiRaw = (r.ui ?? {}) as Partial<UiState>;
    const ui: UiState = {
        selectedClassId: typeof uiRaw.selectedClassId === 'string' ? uiRaw.selectedClassId : Object.keys(classes)[0] ?? 'clase_01',
        minCountByClass: uiRaw.minCountByClass && typeof uiRaw.minCountByClass === 'object' ? (uiRaw.minCountByClass as Record<string, number>) : {},
        minPositiveByClass: uiRaw.minPositiveByClass && typeof uiRaw.minPositiveByClass === 'object' ? (uiRaw.minPositiveByClass as Record<string, number>) : {},
        timerRunning: typeof uiRaw.timerRunning === 'boolean' ? uiRaw.timerRunning : false,
        timerFrozenAt: typeof uiRaw.timerFrozenAt === 'number' && Number.isFinite(uiRaw.timerFrozenAt) ? uiRaw.timerFrozenAt : now,
        lastTickNow: typeof uiRaw.lastTickNow === 'number' && Number.isFinite(uiRaw.lastTickNow) ? uiRaw.lastTickNow : now,
        negMinutesPerPoint: clampMinutes(uiRaw.negMinutesPerPoint, DEFAULT_NEG_MINUTES_PER_POINT),
        posMinutesPerPoint: clampMinutes(uiRaw.posMinutesPerPoint, DEFAULT_POS_MINUTES_PER_POINT),
    };

    // Normaliza students
    let changed = false;
    for (const classId of Object.keys(classes)) {
        const cls = classes[classId];
        if (!cls || !Array.isArray(cls.students)) {
            classes[classId] = { name: cls?.name ?? `Clase ${classId}`, students: [] };
            changed = true;
            continue;
        }
        for (const s of cls.students) {
            if (!s.id) {
                s.id = uid();
                changed = true;
            }
            if (typeof s.count !== 'number') {
                s.count = 0;
                changed = true;
            }
            if (typeof s.positiveCount !== 'number') {
                s.positiveCount = 0;
                changed = true;
            }
            if (typeof s.negSpentMs !== 'number' || !Number.isFinite(s.negSpentMs) || s.negSpentMs < 0) {
                s.negSpentMs = 0;
                changed = true;
            }
            if (!Array.isArray(s.history)) {
                s.history = [];
                changed = true;
            }
        }
    }

    if (!classes[ui.selectedClassId]) {
        ui.selectedClassId = Object.keys(classes)[0] ?? 'clase_01';
        changed = true;
    }

    return { state: { classes, ui }, changed };
};

const dedupeNames = (names: string[]): string[] => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const n of names) {
        const key = n.trim().toLocaleLowerCase();
        if (!key) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(n.trim());
    }
    return out;
};

const parseNames = (text: string): string[] => {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split(/[;,]/)[0].trim())
        .filter(Boolean);
};

const formatRemaining = (ms: number): string => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
};

export const AvisosWidget: FC = () => {
    const { t, ready } = useTranslation();
    const [rawState, setRawState] = useLocalStorage<unknown>(APP_KEY, defaultState());

    const { state, needsMigration } = useMemo(() => {
        const migrated = migrateState(rawState);
        return { state: migrated.state, needsMigration: migrated.changed };
    }, [rawState]);

    useEffect(() => {
        if (needsMigration) {
            setRawState(state);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [needsMigration]);

    const selectedClassId = state.ui.selectedClassId;
    const cls = state.classes[selectedClassId];

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [timerOpen, setTimerOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [classHistoryOpen, setClassHistoryOpen] = useState(false);
    const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

    const [importText, setImportText] = useState('');
    const importFileRef = useRef<HTMLInputElement>(null);
    const importPdfRef = useRef<HTMLInputElement>(null);
    const importBackupRef = useRef<HTMLInputElement>(null);

    const [newStudentName, setNewStudentName] = useState('');
    const [status, setStatus] = useState('');

    const setTransientStatus = (text: string, ms = 2500) => {
        setStatus(text);
        window.setTimeout(() => setStatus(''), ms);
    };

    const getNegMsPerPoint = (s: AppState): number => Math.max(0, s.ui.negMinutesPerPoint) * 60 * 1000;
    const getPosMsPerPoint = (s: AppState): number => Math.max(0, s.ui.posMinutesPerPoint) * 60 * 1000;

    const getEffectiveNow = (s: AppState): number => {
        if (s.ui.timerRunning) return Date.now();
        return typeof s.ui.timerFrozenAt === 'number' && Number.isFinite(s.ui.timerFrozenAt) ? s.ui.timerFrozenAt : Date.now();
    };

    const getNegativeRemainingMs = (student: Student, s: AppState): number => {
        const total = Math.max(0, Math.floor(student.count || 0)) * getNegMsPerPoint(s);
        const spent = Math.max(0, Math.floor(student.negSpentMs || 0));
        return Math.max(0, total - spent);
    };

    const expireNegativesIfNeeded = (clsToUpdate: ClassData, s: AppState): boolean => {
        let changed = false;
        for (const st of clsToUpdate.students) {
            if ((st.count || 0) <= 0) continue;
            const remaining = getNegativeRemainingMs(st, s);
            if (remaining > 0) continue;
            st.count = 0;
            st.negSpentMs = 0;
            changed = true;
        }
        return changed;
    };

    useEffect(() => {
        const id = window.setInterval(() => {
            setRawState((prev: unknown) => {
                const migrated = migrateState(prev).state;
                const currentClass = migrated.classes[migrated.ui.selectedClassId];
                if (!currentClass) return migrated;

                const now = getEffectiveNow(migrated);
                const prevTick = typeof migrated.ui.lastTickNow === 'number' && Number.isFinite(migrated.ui.lastTickNow) ? migrated.ui.lastTickNow : now;
                const delta = Math.max(0, now - prevTick);
                migrated.ui.lastTickNow = now;

                let anyChanged = false;
                if (migrated.ui.timerRunning && delta > 0) {
                    for (const st of currentClass.students) {
                        if ((st.count || 0) <= 0) continue;
                        st.negSpentMs = Math.max(0, (Number(st.negSpentMs) || 0) + delta);
                        anyChanged = true;
                    }
                }

                const expired = expireNegativesIfNeeded(currentClass, migrated);
                if (expired) anyChanged = true;

                return anyChanged ? migrated : prev;
            });
        }, 1000);

        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.ui.negMinutesPerPoint, state.ui.posMinutesPerPoint]);

    const setSelectedClass = (classId: string) => {
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            if (!s.classes[classId]) return s;
            s.ui.selectedClassId = classId;
            s.ui.lastTickNow = getEffectiveNow(s);
            return s;
        });
    };

    const getMinCountForSelectedClass = () => {
        const v = state.ui.minCountByClass[selectedClassId];
        return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
    };

    const getMinPositiveForSelectedClass = () => {
        const v = state.ui.minPositiveByClass[selectedClassId];
        return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
    };

    const setMinCountForSelectedClass = (value: number) => {
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            s.ui.minCountByClass[selectedClassId] = Math.max(0, Math.floor(Number(value) || 0));
            return s;
        });
    };

    const setMinPositiveForSelectedClass = (value: number) => {
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            s.ui.minPositiveByClass[selectedClassId] = Math.max(0, Math.floor(Number(value) || 0));
            return s;
        });
    };

    const clearFilters = () => {
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            s.ui.minCountByClass[selectedClassId] = 0;
            s.ui.minPositiveByClass[selectedClassId] = 0;
            return s;
        });
    };

    const addStudent = () => {
        const name = newStudentName.trim();
        if (!name) return;
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            const c = s.classes[s.ui.selectedClassId];
            if (!c) return s;
            c.students.push({ id: uid(), name, count: 0, positiveCount: 0, negSpentMs: 0, history: [] });
            return s;
        });
        setNewStudentName('');
    };

    const pushHistory = (student: Student, type: StudentEventType) => {
        student.history.push({ ts: Date.now(), type, delta: 1 });
    };

    const addNeg = (studentId: string) => {
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            const c = s.classes[s.ui.selectedClassId];
            if (!c) return s;
            const st = c.students.find((x) => x.id === studentId);
            if (!st) return s;
            st.count = Math.max(0, Math.floor(st.count || 0) + 1);
            pushHistory(st, 'neg');
            return s;
        });
    };

    const addPos = (studentId: string) => {
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            const c = s.classes[s.ui.selectedClassId];
            if (!c) return s;
            const st = c.students.find((x) => x.id === studentId);
            if (!st) return s;
            st.positiveCount = Math.max(0, Math.floor(st.positiveCount || 0) + 1);
            pushHistory(st, 'pos');

            const negMsPerPoint = getNegMsPerPoint(s);
            const posMsPerPoint = getPosMsPerPoint(s);

            if ((st.count || 0) > 0) {
                const total = Math.max(0, Math.floor(st.count || 0)) * negMsPerPoint;
                st.negSpentMs = Math.min(total, Math.max(0, (Number(st.negSpentMs) || 0) + posMsPerPoint));
                if (total - st.negSpentMs <= 0) {
                    st.count = 0;
                    st.negSpentMs = 0;
                }
            }

            return s;
        });
    };

    const editStudent = (studentId: string) => {
        const current = cls.students.find((x) => x.id === studentId);
        if (!current) return;
        const next = window.prompt('Editar alumno', current.name);
        if (next === null) return;
        const name = next.trim();
        if (!name) return;
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            const c = s.classes[s.ui.selectedClassId];
            if (!c) return s;
            const st = c.students.find((x) => x.id === studentId);
            if (!st) return s;
            st.name = name;
            return s;
        });
    };

    const deleteStudent = (studentId: string) => {
        const current = cls.students.find((x) => x.id === studentId);
        if (!current) return;
        const ok = window.confirm(`¿Eliminar a ${current.name}?`);
        if (!ok) return;
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            const c = s.classes[s.ui.selectedClassId];
            if (!c) return s;
            c.students = c.students.filter((x) => x.id !== studentId);
            return s;
        });
    };

    const resetCounters = () => {
        const ok = window.confirm(`¿Reiniciar contadores de ${cls.name}?`);
        if (!ok) return;
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            const c = s.classes[s.ui.selectedClassId];
            if (!c) return s;
            for (const st of c.students) {
                st.count = 0;
                st.positiveCount = 0;
                st.negSpentMs = 0;
            }
            return s;
        });
        setTransientStatus('Contadores reiniciados');
    };

    const startTimer = () => {
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            if (s.ui.timerRunning) return s;
            const now = Date.now();
            s.ui.timerRunning = true;
            s.ui.lastTickNow = now;
            return s;
        });
        setTimerOpen(true);
    };

    const pauseTimer = () => {
        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            if (!s.ui.timerRunning) return s;
            const now = Date.now();
            s.ui.timerRunning = false;
            s.ui.timerFrozenAt = now;
            s.ui.lastTickNow = now;
            return s;
        });
    };

    const applyImport = (names: string[]) => {
        const cleaned = dedupeNames(names.map((n) => n.trim()).filter(Boolean));
        if (cleaned.length === 0) return;

        setRawState((prev: unknown) => {
            const s = migrateState(prev).state;
            const c = s.classes[s.ui.selectedClassId];
            if (!c) return s;

            const existing = new Map(c.students.map((st) => [st.name.toLocaleLowerCase(), st]));
            for (const name of cleaned) {
                const key = name.toLocaleLowerCase();
                if (existing.has(key)) continue;
                const st: Student = { id: uid(), name, count: 0, positiveCount: 0, negSpentMs: 0, history: [] };
                c.students.push(st);
                existing.set(key, st);
            }

            return s;
        });

        setTransientStatus('Importación aplicada');
    };

    const onImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        applyImport(parseNames(text));
        e.target.value = '';
    };

    const exportBackup = () => {
        const payload = {
            app: 'EduAvisos',
            version: 1,
            exportedAt: new Date().toISOString(),
            appKey: APP_KEY,
            state,
        };
        const json = JSON.stringify(payload, null, 2);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eduavisos-backup-${ts}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
        setTransientStatus('Copia exportada');
    };

    const extractStateFromBackupPayload = (payload: unknown): AppState | null => {
        if (!payload || typeof payload !== 'object') return null;

        const p = payload as Record<string, unknown>;
        const stateCandidate = p.state;
        if (stateCandidate && typeof stateCandidate === 'object') return stateCandidate as AppState;

        const classesCandidate = p.classes;
        if (classesCandidate && typeof classesCandidate === 'object') return payload as AppState;

        return null;
    };

    const onImportBackup = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ok = window.confirm('Esto reemplazará TODOS tus datos (todas las clases) por la copia importada. ¿Continuar?');
        if (!ok) {
            e.target.value = '';
            return;
        }
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const next = extractStateFromBackupPayload(parsed);
            if (!next) {
                setTransientStatus('Formato de copia no reconocido', 4000);
                e.target.value = '';
                return;
            }
            setRawState(migrateState(next).state);
            setTransientStatus('Copia importada');
        } catch {
            setTransientStatus('El archivo no es JSON válido', 4000);
        } finally {
            e.target.value = '';
        }
    };

    const ensurePdfJs = async () => {
        // pdfjs-dist expone ESM y se integra bien con Vite.
        const pdfjs = await import('pdfjs-dist');
        const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string;
        (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
        return pdfjs;
    };

    const parseNamesFromPdfText = (text: string): string[] => {
        const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

        const candidates: string[] = [];

        for (const l of lines) {
            if (!l.includes(',')) continue;
            const parts = l.split(',').map((p) => p.trim()).filter(Boolean);
            if (parts.length < 2) continue;
            const name = `${parts[1]} ${parts[0]}`.replace(/\s+/g, ' ').trim();
            if (name) candidates.push(name);
        }

        const nameWord = '[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+';
        const re = new RegExp(`^${nameWord}(?:[ \\-]${nameWord}){1,3}$`);
        for (let l of lines) {
            l = l.replace(/[•·\t]+/g, ' ');
            l = l.replace(/\s+/g, ' ').trim();
            if (re.test(l)) candidates.push(l);
        }

        return dedupeNames(candidates);
    };

    type PdfTextContent = { items: unknown[] };
    type PdfPage = { getTextContent: () => Promise<PdfTextContent> };
    type PdfDocument = { numPages: number; getPage: (pageNumber: number) => Promise<PdfPage> };

    const onImportPdf = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const pdfjs = await ensurePdfJs();
            const buf = await file.arrayBuffer();
            const loadingTask = (pdfjs as unknown as { getDocument: (args: unknown) => { promise: Promise<unknown> } }).getDocument({ data: buf });
            const pdf = (await loadingTask.promise) as PdfDocument;
            const parts: string[] = [];
            for (let p = 1; p <= pdf.numPages; p++) {
                const page = await pdf.getPage(p);
                const content = await page.getTextContent();
                const strings = (content.items as Array<{ str?: unknown }>)
                    .map((it) => (typeof it?.str === 'string' ? it.str : ''))
                    .filter(Boolean);
                parts.push(strings.join('\n'));
            }
            const text = parts.join('\n');
            const names = parseNamesFromPdfText(text);
            applyImport(names);
            setTransientStatus('PDF importado');
        } catch (err) {
            console.error(err);
            setTransientStatus('No se pudo importar el PDF', 4000);
        } finally {
            e.target.value = '';
        }
    };

    const minNeg = getMinCountForSelectedClass();
    const minPos = getMinPositiveForSelectedClass();
    const filteredStudents = cls.students
        .filter((s) => (s.count || 0) >= minNeg)
        .filter((s) => (s.positiveCount || 0) >= minPos);

    const timerPendingStudents = cls.students
        .map((s) => ({ s, remaining: getNegativeRemainingMs(s, state) }))
        .filter((x) => x.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining);

    const historyStudent = historyStudentId ? cls.students.find((s) => s.id === historyStudentId) : null;

    const byStudent = new Map<string, { name: string; neg: number; pos: number }>();
    for (const s of cls.students) {
        let neg = 0;
        let pos = 0;
        for (const ev of s.history || []) {
            if (ev.type === 'neg') neg += ev.delta || 1;
            if (ev.type === 'pos') pos += ev.delta || 1;
        }
        byStudent.set(s.id, { name: s.name, neg, pos });
    }
    const classHistoryRows = Array.from(byStudent.values()).sort((a, b) => (b.neg + b.pos) - (a.neg + a.pos));

    if (!ready) {
        return <div className="avisos-loading">{t('loading')}</div>;
    }

    return (
        <div className="avisos-native">
            <div className="avisos-header">
                <div className="avisos-header-left">
                    <div className="avisos-title">{t('widgets.avisos.title')}</div>
                    <label className="avisos-field">
                        <span className="avisos-label">Clase</span>
                        <select
                            className="avisos-select"
                            value={selectedClassId}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            {Object.entries(state.classes).map(([id, c]) => (
                                <option key={id} value={id}>{c.name}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="avisos-header-right">
                    <button type="button" className="avisos-btn" onClick={resetCounters} title="Reiniciar contadores">
                        <RotateCcw size={16} />
                        <span>Reiniciar</span>
                    </button>
                    <button type="button" className="avisos-btn" onClick={startTimer} title="Play">
                        <Play size={16} />
                        <span>Play</span>
                    </button>
                    <button type="button" className="avisos-btn" onClick={pauseTimer} title="Pausa">
                        <Pause size={16} />
                        <span>Pausa</span>
                    </button>
                    <button type="button" className="avisos-btn" onClick={() => setSettingsOpen(true)} title="Configuración">
                        <Settings size={16} />
                        <span>Config</span>
                    </button>
                </div>
            </div>

            <div className="avisos-toolbar">
                <label className="avisos-field-inline">
                    <span className="avisos-label">☹︎ ≥</span>
                    <input
                        className="avisos-input-small"
                        type="number"
                        min={0}
                        step={1}
                        value={getMinCountForSelectedClass()}
                        onChange={(e) => setMinCountForSelectedClass(Number(e.target.value))}
                    />
                </label>
                <label className="avisos-field-inline">
                    <span className="avisos-label">🙂 ≥</span>
                    <input
                        className="avisos-input-small"
                        type="number"
                        min={0}
                        step={1}
                        value={getMinPositiveForSelectedClass()}
                        onChange={(e) => setMinPositiveForSelectedClass(Number(e.target.value))}
                    />
                </label>
                <button type="button" className="avisos-btn" onClick={clearFilters}>
                    Limpiar filtro
                </button>
                <button type="button" className="avisos-btn" onClick={() => setTimerOpen(true)}>
                    Tiempo pendiente
                </button>
                <button type="button" className="avisos-btn" onClick={() => setClassHistoryOpen(true)}>
                    Histórico clase
                </button>
                <div className="avisos-status">{status}</div>
            </div>

            <div className="avisos-add">
                <input
                    className="avisos-input"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Añadir alumno"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') addStudent();
                    }}
                />
                <button type="button" className="avisos-btn" onClick={addStudent}>Añadir</button>
            </div>

            {filteredStudents.length === 0 ? (
                <div className="avisos-empty">Aún no hay alumnos en esta clase (o el filtro no muestra ninguno).</div>
            ) : (
                <ul className="avisos-list" aria-label="Lista de alumnos">
                    {filteredStudents.map((s) => {
                        const remaining = getNegativeRemainingMs(s, state);
                        const icon = state.ui.timerRunning ? '⏱' : '⏸';
                        return (
                            <li key={s.id} className="avisos-row">
                                <button type="button" className="avisos-name" onClick={() => addNeg(s.id)} title="Click: +1 ☹︎">
                                    {s.name}
                                </button>
                                <div className="avisos-row-right">
                                    <span className="avisos-timer" title="Tiempo pendiente">{icon} {remaining > 0 ? formatRemaining(remaining) : '00:00'}</span>
                                    <button type="button" className="avisos-pill" onClick={() => addNeg(s.id)}>+☹︎</button>
                                    <button type="button" className="avisos-pill" onClick={() => addPos(s.id)}>+🙂</button>
                                    <span className="avisos-count">☹︎ {s.count}</span>
                                    <span className="avisos-count">🙂 {s.positiveCount}</span>
                                    <button
                                        type="button"
                                        className="avisos-icon-btn"
                                        title="Histórico"
                                        onClick={() => {
                                            setHistoryStudentId(s.id);
                                            setHistoryOpen(true);
                                        }}
                                    >
                                        <History size={16} />
                                    </button>
                                    <button type="button" className="avisos-icon-btn" title="Editar" onClick={() => editStudent(s.id)}>
                                        Edit
                                    </button>
                                    <button type="button" className="avisos-icon-btn" title="Eliminar" onClick={() => deleteStudent(s.id)}>
                                        X
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {settingsOpen && (
                <div className="avisos-modal-backdrop" role="dialog" aria-modal="true">
                    <div className="avisos-modal">
                        <div className="avisos-modal-header">
                            <div className="avisos-modal-title">Configuración</div>
                            <button type="button" className="avisos-btn" onClick={() => setSettingsOpen(false)}>Cerrar</button>
                        </div>

                        <div className="avisos-section">
                            <div className="avisos-section-title">Clase</div>
                            <div className="avisos-row-form">
                                <input
                                    className="avisos-input"
                                    value={cls.name}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setRawState((prev: unknown) => {
                                            const s = migrateState(prev).state;
                                            s.classes[s.ui.selectedClassId].name = v;
                                            return s;
                                        });
                                    }}
                                    placeholder="Ej: 1ºA"
                                />
                            </div>
                        </div>

                        <div className="avisos-section">
                            <div className="avisos-section-title">Minutos por punto</div>
                            <div className="avisos-row-form">
                                <label className="avisos-field-inline">
                                    <span className="avisos-label">Minutos por ☹︎</span>
                                    <input
                                        className="avisos-input-small"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={state.ui.negMinutesPerPoint}
                                        onChange={(e) => {
                                            const v = clampMinutes(e.target.value, DEFAULT_NEG_MINUTES_PER_POINT);
                                            setRawState((prev: unknown) => {
                                                const s = migrateState(prev).state;
                                                s.ui.negMinutesPerPoint = v;
                                                return s;
                                            });
                                        }}
                                    />
                                </label>
                                <label className="avisos-field-inline">
                                    <span className="avisos-label">Minutos por 🙂</span>
                                    <input
                                        className="avisos-input-small"
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={state.ui.posMinutesPerPoint}
                                        onChange={(e) => {
                                            const v = clampMinutes(e.target.value, DEFAULT_POS_MINUTES_PER_POINT);
                                            setRawState((prev: unknown) => {
                                                const s = migrateState(prev).state;
                                                s.ui.posMinutesPerPoint = v;
                                                return s;
                                            });
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="avisos-section">
                            <div className="avisos-section-title">Backup</div>
                            <div className="avisos-row-form">
                                <button type="button" className="avisos-btn" onClick={exportBackup}><Download size={16} /> Exportar</button>
                                <label className="avisos-btn avisos-file">
                                    <Upload size={16} /> Importar
                                    <input ref={importBackupRef} type="file" accept="application/json,.json" onChange={onImportBackup} />
                                </label>
                            </div>
                        </div>

                        <div className="avisos-section">
                            <div className="avisos-section-title">Importar alumnos</div>
                            <textarea
                                className="avisos-textarea"
                                rows={6}
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder="Pega 1 alumno por línea"
                            />
                            <div className="avisos-row-form">
                                <button
                                    type="button"
                                    className="avisos-btn"
                                    onClick={() => {
                                        applyImport(parseNames(importText));
                                        setImportText('');
                                    }}
                                >
                                    Aplicar
                                </button>
                                <label className="avisos-btn avisos-file">
                                    <Upload size={16} /> TXT/CSV
                                    <input ref={importFileRef} type="file" accept=".txt,.csv,text/plain,text/csv" onChange={onImportFile} />
                                </label>
                                <label className="avisos-btn avisos-file">
                                    <Upload size={16} /> PDF
                                    <input ref={importPdfRef} type="file" accept="application/pdf,.pdf" onChange={onImportPdf} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {timerOpen && (
                <div className="avisos-modal-backdrop" role="dialog" aria-modal="true">
                    <div className="avisos-modal">
                        <div className="avisos-modal-header">
                            <div className="avisos-modal-title">Tiempo pendiente (☹︎)</div>
                            <button type="button" className="avisos-btn" onClick={() => setTimerOpen(false)}>Cerrar</button>
                        </div>
                        {timerPendingStudents.length === 0 ? (
                            <div className="avisos-empty">No hay alumnos con tiempo pendiente en esta clase.</div>
                        ) : (
                            <ul className="avisos-list">
                                {timerPendingStudents.map(({ s, remaining }) => (
                                    <li key={s.id} className="avisos-row">
                                        <span className="avisos-name-static">{s.name}</span>
                                        <span className="avisos-timer">⏱ {formatRemaining(remaining)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {historyOpen && historyStudent && (
                <div className="avisos-modal-backdrop" role="dialog" aria-modal="true">
                    <div className="avisos-modal">
                        <div className="avisos-modal-header">
                            <div className="avisos-modal-title">Histórico — {historyStudent.name}</div>
                            <button type="button" className="avisos-btn" onClick={() => setHistoryOpen(false)}>Cerrar</button>
                        </div>
                        {historyStudent.history.length === 0 ? (
                            <div className="avisos-empty">Este alumno aún no tiene eventos en el histórico.</div>
                        ) : (
                            <ul className="avisos-list">
                                {[...historyStudent.history].reverse().map((ev, idx) => (
                                    <li key={idx} className="avisos-row">
                                        <span className="avisos-name-static">{new Date(ev.ts).toLocaleString()}</span>
                                        <span className="avisos-count">{ev.type === 'neg' ? '☹︎' : '🙂'} +{ev.delta || 1}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {classHistoryOpen && (
                <div className="avisos-modal-backdrop" role="dialog" aria-modal="true">
                    <div className="avisos-modal">
                        <div className="avisos-modal-header">
                            <div className="avisos-modal-title">Histórico de la clase</div>
                            <button type="button" className="avisos-btn" onClick={() => setClassHistoryOpen(false)}>Cerrar</button>
                        </div>
                        {classHistoryRows.length === 0 ? (
                            <div className="avisos-empty">Esta clase aún no tiene puntos en el histórico.</div>
                        ) : (
                            <ul className="avisos-list">
                                {classHistoryRows.map((r, idx) => (
                                    <li key={idx} className="avisos-row">
                                        <span className="avisos-name-static">{r.name}</span>
                                        <span className="avisos-count">☹︎ {r.neg}</span>
                                        <span className="avisos-count">🙂 {r.pos}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const WidgetIcon: FC = () => {
    const { t } = useTranslation();

    return (
        <img
            src={withBaseUrl('icons/WorkList.png')}
            alt={t('widgets.avisos.title')}
            width={52}
            height={52}
        />
    );
};

export const widgetConfig: Omit<WidgetConfig, 'component'> = {
    id: 'avisos',
    title: 'widgets.avisos.title',
    icon: <WidgetIcon />,
    defaultSize: { width: 900, height: 650 },
};
