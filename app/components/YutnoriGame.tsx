"use client";

import { useEffect, useRef, useCallback } from "react";

/* ================================================================
   윷놀이 (Yutnori) – React Client Component
   원본 origin 파일의 전체 로직을 React/Next.js 용으로 변환
   ================================================================ */

// ---- 상수 ----
const SVG_SIZE = 1000;
const FINISH_NODE_IDX = 19;
const PIECE_RADIUS = 30;

const TEAM_COLORS = [
    { bg: "bg-red-500", border: "border-red-700", name: "빨강팀", hex: "#ef4444" },
    { bg: "bg-blue-500", border: "border-blue-700", name: "파랑팀", hex: "#3b82f6" },
    { bg: "bg-green-500", border: "border-green-700", name: "초록팀", hex: "#22c55e" },
    { bg: "bg-yellow-400", border: "border-yellow-600", name: "노랑팀", hex: "#facc15" },
    { bg: "bg-purple-500", border: "border-purple-700", name: "보라팀", hex: "#a855f7" },
    { bg: "bg-orange-500", border: "border-orange-700", name: "주황팀", hex: "#f97316" },
    { bg: "bg-teal-500", border: "border-teal-700", name: "청록팀", hex: "#14b8a6" },
    { bg: "bg-pink-500", border: "border-pink-700", name: "분홍팀", hex: "#ec4899" },
];

// ---- 타입 ----
interface Piece {
    id: string;
    teamIdx: number;
    isStacked: boolean;
    stackMembers: string[];
    location: "waiting" | "board" | "finished";
    boardIdx: number;
}

interface Station {
    x: number;
    y: number;
    type?: string;
    renderIdx: number;
}

// ---- 좌표 계산 ----
function defineStations(): Station[] {
    const stations: { x: number; y: number; type?: string }[] = [];
    const padding = 150;
    const step = (SVG_SIZE - padding * 2) / 5;

    for (let i = 1; i <= 5; i++)
        stations.push({ x: SVG_SIZE - padding, y: SVG_SIZE - padding - step * i });
    for (let i = 1; i <= 5; i++)
        stations.push({ x: SVG_SIZE - padding - step * i, y: padding });
    for (let i = 1; i <= 5; i++)
        stations.push({ x: padding, y: padding + step * i });
    for (let i = 1; i <= 5; i++)
        stations.push({ x: padding + step * i, y: SVG_SIZE - padding });

    const center = { x: 500, y: 500, type: "center" };
    stations.push({ x: 730, y: 270, type: "diag" });
    stations.push({ x: 615, y: 385, type: "diag" });
    stations.push(center);
    stations.push({ x: 385, y: 615, type: "diag" });
    stations.push({ x: 270, y: 730, type: "diag" });

    stations.push({ x: 270, y: 270, type: "diag" });
    stations.push({ x: 385, y: 385, type: "diag" });
    stations.push({ x: 615, y: 615, type: "diag" });
    stations.push({ x: 730, y: 730, type: "diag" });

    return stations.map((s, i) => ({ ...s, renderIdx: i }));
}

/* ================================================================
   메인 컴포넌트
   ================================================================ */
export default function YutnoriGame() {
    // DOM 직접 조작이 필요한 게임이므로 ref 기반으로 원본 로직을 최대한 보존합니다.
    const containerRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);

    // 원본의 전역 상태를 클로저로 관리
    const gameRef = useRef<{
        stations: Station[];
        pieces: Piece[];
        history: Piece[][];
        draggedEl: HTMLElement | null;
        dragOffset: { x: number; y: number };
        activePieceData: Piece | null;
        highlightedStationIdx: number;
    }>({
        stations: [],
        pieces: [],
        history: [],
        draggedEl: null,
        dragOffset: { x: 0, y: 0 },
        activePieceData: null,
        highlightedStationIdx: -1,
    });

    /* ---- 유틸리티 함수들 ---- */

    const showBigMessage = useCallback(
        (mainText: string, subText: string, colorClass: string) => {
            const overlay = document.getElementById("actionOverlay");
            const textEl = document.getElementById("actionText");
            const subEl = document.getElementById("actionSubText");
            if (!overlay || !textEl || !subEl) return;

            overlay.classList.remove("hidden");
            overlay.classList.add("flex");

            textEl.classList.remove("action-effect");
            void (textEl as HTMLElement).offsetWidth;
            textEl.classList.add("action-effect");

            textEl.textContent = mainText;
            textEl.className = `text-7xl md:text-8xl font-black drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] stroke-black action-effect text-center whitespace-nowrap ${colorClass}`;
            subEl.textContent = subText;

            setTimeout(() => {
                overlay.classList.add("hidden");
                overlay.classList.remove("flex");
            }, 1800);
        },
        []
    );

    const createConfetti = useCallback(() => {
        const colors = ["#f00", "#0f0", "#00f", "#ff0"];
        for (let i = 0; i < 60; i++) {
            const div = document.createElement("div");
            div.style.cssText = `position:fixed; left:${Math.random() * 100}vw; top:-10px; width:10px; height:10px; background:${colors[Math.floor(Math.random() * 4)]}; z-index:9999; transition: top 3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 3s;`;
            document.body.appendChild(div);
            setTimeout(() => {
                div.style.top = "110vh";
                div.style.left = `${parseFloat(div.style.left) + (Math.random() - 0.5) * 20}vw`;
                div.style.opacity = "0";
            }, 100);
            setTimeout(() => div.remove(), 3100);
        }
    }, []);

    /* ---- 보드 초기화 ---- */
    const initBoard = useCallback(() => {
        const svgGroup = document.getElementById("stationsGroup");
        if (!svgGroup) return;
        svgGroup.innerHTML = "";
        gameRef.current.stations = defineStations();

        gameRef.current.stations.forEach((s, i) => {
            const circle = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );
            circle.setAttribute("cx", String(s.x));
            circle.setAttribute("cy", String(s.y));
            circle.setAttribute("r", String(PIECE_RADIUS));
            circle.setAttribute("class", "station transition-all duration-200");
            circle.id = `station-${i}`;

            if (
                i === 4 ||
                i === 9 ||
                i === 14 ||
                i === 19 ||
                s.type === "center"
            ) {
                circle.setAttribute("r", String(PIECE_RADIUS * 1.4));
                circle.style.strokeWidth = "4px";
            }
            if (i === FINISH_NODE_IDX) {
                circle.classList.add("station-start-end");
            }

            svgGroup.appendChild(circle);
        });
    }, []);

    /* ---- 말 요소 생성 ---- */
    const createPieceElement = useCallback(
        (teamIdx: number, _pieceIdx: number, id: string) => {
            const el = document.createElement("div");
            const colorClass = TEAM_COLORS[teamIdx].bg;
            const textClass = teamIdx === 3 ? "text-black" : "text-white";

            el.className = `mal w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-white ${colorClass} ${textClass}`;
            el.id = id;
            el.dataset.team = String(teamIdx);
            el.dataset.id = id;

            return el;
        },
        []
    );

    /* ---- 시각 갱신 ---- */
    const placePieceVisual = useCallback(
        (el: HTMLElement, stationIdx: number) => {
            const station = gameRef.current.stations[stationIdx];
            if (!station) return;

            const leftPct = (station.x / SVG_SIZE) * 100;
            const topPct = (station.y / SVG_SIZE) * 100;

            el.style.position = "absolute";
            el.style.left = `${leftPct}%`;
            el.style.top = `${topPct}%`;
            el.style.transform = "translate(-50%, -50%)";
            el.style.zIndex = "50";
            el.style.width = "6.5%";
            el.style.height = "6.5%";
        },
        []
    );

    const updateStackVisual = useCallback((mainPiece: Piece) => {
        const el = document.getElementById(mainPiece.id);
        if (!el) return;
        const count = mainPiece.stackMembers.length;
        el.textContent = count > 1 ? `x${count}` : "";
        if (count > 1) {
            el.style.borderWidth = "3px";
            el.style.borderColor = "#fff";
        }
    }, []);

    const restoreToWaitingArea = useCallback(
        (piece: Piece) => {
            const waitingArea = document.getElementById("waitingArea");
            if (!waitingArea) return;
            const teamDiv = waitingArea.children[piece.teamIdx] as HTMLElement;
            if (!teamDiv) return;
            const piecesContainer = teamDiv.querySelector(
                ".pieces-container"
            ) as HTMLElement;
            if (!piecesContainer) return;
            const newEl = createPieceElement(
                piece.teamIdx,
                parseInt(piece.id.split("p")[1]),
                piece.id
            );
            attachPieceEvents(newEl);
            piecesContainer.appendChild(newEl);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    /* ---- undo ---- */
    const updateUndoButton = useCallback(() => {
        const btn = document.getElementById("undoBtn") as HTMLButtonElement | null;
        if (!btn) return;
        btn.disabled = gameRef.current.history.length === 0;
        if (btn.disabled) {
            btn.classList.add("opacity-50", "cursor-not-allowed");
        } else {
            btn.classList.remove("opacity-50", "cursor-not-allowed");
        }
    }, []);

    const saveState = useCallback(() => {
        const snapshot = JSON.parse(
            JSON.stringify(gameRef.current.pieces)
        ) as Piece[];
        gameRef.current.history.push(snapshot);
        if (gameRef.current.history.length > 20) gameRef.current.history.shift();
        updateUndoButton();
    }, [updateUndoButton]);

    /* ---- 전체 렌더링 (undo 후 등) ---- */
    const renderAllPieces = useCallback(() => {
        const pieceLayer = document.getElementById("pieceLayer");
        if (pieceLayer) pieceLayer.innerHTML = "";

        const waitingContainers = document.querySelectorAll(".pieces-container");
        const finishedContainers = document.querySelectorAll(
            ".finished-container"
        );

        waitingContainers.forEach((c) => (c.innerHTML = ""));
        finishedContainers.forEach((c) => {
            const label = c.querySelector("span");
            c.innerHTML = "";
            if (label) c.appendChild(label);
        });

        gameRef.current.pieces.forEach((piece) => {
            const teamIdx = piece.teamIdx;
            const pieceIdx = parseInt(piece.id.split("p")[1]);
            const el = createPieceElement(teamIdx, pieceIdx, piece.id);
            attachPieceEvents(el);

            if (piece.location === "waiting") {
                const teamDiv = document.getElementById("waitingArea")?.children[
                    teamIdx
                ] as HTMLElement | undefined;
                const container = teamDiv?.querySelector(
                    ".pieces-container"
                ) as HTMLElement | null;
                container?.appendChild(el);
            } else if (piece.location === "board") {
                if (!piece.isStacked) {
                    pieceLayer?.appendChild(el);
                    placePieceVisual(el, piece.boardIdx);
                    updateStackVisual(piece);
                }
            } else if (piece.location === "finished") {
                const teamDiv = document.getElementById("waitingArea")?.children[
                    teamIdx
                ] as HTMLElement | undefined;
                const container = teamDiv?.querySelector(
                    ".finished-container"
                ) as HTMLElement | null;
                el.classList.add("finished");
                container?.appendChild(el);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [createPieceElement, placePieceVisual, updateStackVisual]);

    /* ---- 드래그 & 드롭 ---- */
    const handleDragMove = useCallback(
        (e: PointerEvent) => {
            const game = gameRef.current;
            if (!game.draggedEl) return;
            e.preventDefault();

            const clientX = e.clientX;
            const clientY = e.clientY;

            game.draggedEl.style.left = clientX - game.dragOffset.x + "px";
            game.draggedEl.style.top = clientY - game.dragOffset.y + "px";

            const boardSvg = document.getElementById("boardSvg");
            if (!boardSvg) return;
            const boardRect = boardSvg.getBoundingClientRect();

            const scaleX = SVG_SIZE / boardRect.width;
            const scaleY = SVG_SIZE / boardRect.height;
            const boardX = (clientX - boardRect.left) * scaleX;
            const boardY = (clientY - boardRect.top) * scaleY;

            let closestIdx = -1;
            let minDist = 70;

            game.stations.forEach((s, idx) => {
                const dist = Math.hypot(s.x - boardX, s.y - boardY);
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = idx;
                }
            });

            let isExitHovered = false;
            if (
                game.activePieceData &&
                game.activePieceData.location === "board" &&
                game.activePieceData.boardIdx === FINISH_NODE_IDX
            ) {
                const fz = document
                    .getElementById("finishZone")
                    ?.getBoundingClientRect();
                if (fz) {
                    const distToFinish = Math.hypot(
                        clientX - (fz.left + fz.width / 2),
                        clientY - (fz.top + fz.height / 2)
                    );
                    if (distToFinish < 80) isExitHovered = true;
                }
            }

            if (
                game.highlightedStationIdx !== -1 &&
                game.highlightedStationIdx !== closestIdx
            ) {
                document
                    .getElementById(`station-${game.highlightedStationIdx}`)
                    ?.classList.remove("highlight");
            }

            if (isExitHovered) {
                document.getElementById("finishZone")?.classList.add("active");
                game.highlightedStationIdx = -2;
            } else if (closestIdx !== -1) {
                document
                    .getElementById(`station-${closestIdx}`)
                    ?.classList.add("highlight");
                document.getElementById("finishZone")?.classList.remove("active");
                game.highlightedStationIdx = closestIdx;
            } else {
                document.getElementById("finishZone")?.classList.remove("active");
                game.highlightedStationIdx = -1;
            }
        },
        []
    );

    const handleMoveToStation = useCallback(
        (piece: Piece, el: HTMLElement, stationIdx: number) => {
            const game = gameRef.current;
            const occupant = game.pieces.find(
                (p) =>
                    p.location === "board" &&
                    p.boardIdx === stationIdx &&
                    p.id !== piece.id &&
                    !p.isStacked
            );

            if (occupant) {
                if (occupant.teamIdx === piece.teamIdx) {
                    // 업기
                    occupant.stackMembers = [
                        ...occupant.stackMembers,
                        ...piece.stackMembers,
                    ];
                    piece.stackMembers.forEach((pid) => {
                        const p = game.pieces.find((x) => x.id === pid)!;
                        p.isStacked = true;
                        p.location = "board";
                        p.boardIdx = stationIdx;
                    });
                    updateStackVisual(occupant);
                    el.remove();
                    showBigMessage(
                        "업었다!",
                        `${TEAM_COLORS[piece.teamIdx].name}끼리 뭉쳤습니다!`,
                        "text-blue-400"
                    );
                    return;
                } else {
                    // 잡기
                    const victimName = TEAM_COLORS[occupant.teamIdx].name;
                    occupant.stackMembers.forEach((pid) => {
                        const p = game.pieces.find((x) => x.id === pid)!;
                        p.isStacked = false;
                        p.stackMembers = [pid];
                        p.location = "waiting";
                        p.boardIdx = -1;
                        document.getElementById(pid)?.remove();
                        restoreToWaitingArea(p);
                    });
                    showBigMessage(
                        "잡았다!",
                        `${victimName}을 집으로 보냅니다!`,
                        "text-red-500"
                    );
                }
            }

            piece.location = "board";
            piece.boardIdx = stationIdx;
            piece.stackMembers.forEach((pid) => {
                if (pid !== piece.id) {
                    const p = game.pieces.find((x) => x.id === pid);
                    if (p) p.boardIdx = stationIdx;
                }
            });

            document.getElementById("pieceLayer")?.appendChild(el);
            placePieceVisual(el, stationIdx);
        },
        [placePieceVisual, restoreToWaitingArea, showBigMessage, updateStackVisual]
    );

    const handleFinish = useCallback(
        (piece: Piece, _el: HTMLElement) => {
            const game = gameRef.current;

            piece.stackMembers.forEach((pid) => {
                const p = game.pieces.find((x) => x.id === pid)!;
                p.location = "finished";
                p.boardIdx = -1;
                p.isStacked = false;
            });

            renderAllPieces();

            const teamName = TEAM_COLORS[piece.teamIdx].name;

            if (
                game.pieces
                    .filter((p) => p.teamIdx === piece.teamIdx)
                    .every((p) => p.location === "finished")
            ) {
                showBigMessage("승리!!!", `${teamName} 최종 우승!`, "text-yellow-400");
                createConfetti();
            } else {
                showBigMessage("골인!", `${teamName} 말 나기 성공!`, "text-green-400");
            }
        },
        [createConfetti, renderAllPieces, showBigMessage]
    );

    const returnToPrevious = useCallback(
        (piece: Piece, el: HTMLElement) => {
            if (piece.location === "waiting") {
                restoreToWaitingArea(piece);
                el.remove();
            } else {
                document.getElementById("pieceLayer")?.appendChild(el);
                placePieceVisual(el, piece.boardIdx);
            }
        },
        [placePieceVisual, restoreToWaitingArea]
    );

    const handleDragEnd = useCallback(
        (_e: PointerEvent) => {
            const game = gameRef.current;
            if (!game.draggedEl) return;

            document.removeEventListener("pointermove", handleDragMove);
            document.removeEventListener("pointerup", handleDragEnd);
            document.removeEventListener("pointercancel", handleDragEnd);

            game.draggedEl.style.pointerEvents = "auto";

            if (game.highlightedStationIdx >= 0) {
                document
                    .getElementById(`station-${game.highlightedStationIdx}`)
                    ?.classList.remove("highlight");
            }

            const finishZone = document.getElementById("finishZone");
            finishZone?.classList.remove("active", "enabled");

            if (
                game.highlightedStationIdx === -2 ||
                game.highlightedStationIdx >= 0
            ) {
                saveState();
            }

            if (game.highlightedStationIdx === -2) {
                if (
                    game.activePieceData &&
                    game.activePieceData.location === "board" &&
                    game.activePieceData.boardIdx === FINISH_NODE_IDX
                ) {
                    handleFinish(game.activePieceData, game.draggedEl);
                } else if (game.activePieceData) {
                    returnToPrevious(game.activePieceData, game.draggedEl);
                }
            } else if (game.highlightedStationIdx >= 0 && game.activePieceData) {
                handleMoveToStation(
                    game.activePieceData,
                    game.draggedEl,
                    game.highlightedStationIdx
                );
            } else if (game.activePieceData) {
                returnToPrevious(game.activePieceData, game.draggedEl);
            }

            game.draggedEl = null;
            game.activePieceData = null;
            game.highlightedStationIdx = -1;
        },
        [
            handleDragMove,
            handleFinish,
            handleMoveToStation,
            returnToPrevious,
            saveState,
        ]
    );

    const handleDragStart = useCallback(
        (e: PointerEvent) => {
            const target = (e.target as HTMLElement).closest(".mal") as HTMLElement;
            if (!target) return;

            const pieceId = target.dataset.id!;
            const game = gameRef.current;
            const activePiece = game.pieces.find((p) => p.id === pieceId);
            if (!activePiece || activePiece.location === "finished") return;

            game.activePieceData = activePiece;
            game.draggedEl = target;

            const isExitPossible =
                activePiece.location === "board" &&
                activePiece.boardIdx === FINISH_NODE_IDX;
            const finishZone = document.getElementById("finishZone");
            if (isExitPossible) {
                finishZone?.classList.add("enabled");
            } else {
                finishZone?.classList.remove("enabled");
            }

            const clientX = e.clientX;
            const clientY = e.clientY;

            const w = target.offsetWidth;
            const h = target.offsetHeight;

            target.style.width = w + "px";
            target.style.height = h + "px";

            game.dragOffset.x = w / 2;
            game.dragOffset.y = h / 2;

            target.style.position = "fixed";
            target.style.transform = "scale(1.2)";
            target.style.zIndex = "9999";
            target.style.pointerEvents = "none";

            target.style.left = clientX - game.dragOffset.x + "px";
            target.style.top = clientY - game.dragOffset.y + "px";

            document.body.appendChild(target);

            document.addEventListener("pointermove", handleDragMove);
            document.addEventListener("pointerup", handleDragEnd);
            document.addEventListener("pointercancel", handleDragEnd);
        },
        [handleDragEnd, handleDragMove]
    );

    const handleDoubleClick = useCallback(
        (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest(".mal") as HTMLElement;
            if (!target) return;
            const pid = target.dataset.id!;
            const game = gameRef.current;
            const piece = game.pieces.find((p) => p.id === pid);
            if (!piece) return;

            if (piece.stackMembers.length > 1 && piece.location === "board") {
                if (confirm("이 말을 분리하시겠습니까?")) {
                    saveState();
                    const currentIdx = piece.boardIdx;
                    const members = [...piece.stackMembers];
                    piece.stackMembers = [piece.id];
                    updateStackVisual(piece);

                    members.forEach((mpid) => {
                        if (mpid !== piece.id) {
                            const mp = game.pieces.find((p) => p.id === mpid)!;
                            mp.isStacked = false;
                            mp.stackMembers = [mpid];
                            mp.location = "board";
                            mp.boardIdx = currentIdx;
                            const newEl = createPieceElement(
                                mp.teamIdx,
                                parseInt(mpid.split("p")[1]),
                                mpid
                            );
                            attachPieceEvents(newEl);
                            document.getElementById("pieceLayer")?.appendChild(newEl);
                            placePieceVisual(newEl, currentIdx);
                            newEl.style.marginLeft = `${(Math.random() - 0.5) * 4}%`;
                            newEl.style.marginTop = `${(Math.random() - 0.5) * 4}%`;
                        }
                    });
                }
            }
        },
        [createPieceElement, placePieceVisual, saveState, updateStackVisual]
    );

    // 이벤트 연결 헬퍼 — DOM 요소에 직접 이벤트 바인딩
    // eslint-disable-next-line react-hooks/exhaustive-deps
    function attachPieceEvents(el: HTMLElement) {
        el.addEventListener("pointerdown", handleDragStart as EventListener);
        el.addEventListener("dblclick", handleDoubleClick as EventListener);
    }

    /* ---- 게임 초기화 ---- */
    const initGame = useCallback(() => {
        const teamCountEl = document.getElementById(
            "teamCount"
        ) as HTMLSelectElement | null;
        const pieceCountEl = document.getElementById(
            "pieceCount"
        ) as HTMLSelectElement | null;
        const teamCount = parseInt(teamCountEl?.value || "2");
        const pieceCount = parseInt(pieceCountEl?.value || "4");

        const game = gameRef.current;
        game.pieces = [];
        game.history = [];
        updateUndoButton();

        const waitingArea = document.getElementById("waitingArea");
        if (!waitingArea) return;
        waitingArea.innerHTML = "";

        for (let t = 0; t < teamCount; t++) {
            const teamConfig = TEAM_COLORS[t];

            // 팀 박스
            const teamDiv = document.createElement("div");
            teamDiv.className = `flex flex-col p-2 rounded-lg bg-white/60 border-l-4 ${teamConfig.border} shadow-sm`;

            // 헤더
            const header = document.createElement("div");
            header.className =
                "flex justify-between items-center mb-1 border-b border-gray-200 pb-1";
            const teamLabel = document.createElement("span");
            teamLabel.textContent = teamConfig.name;
            teamLabel.className = `text-sm font-black ${t === 3 ? "text-black" : "text-gray-800"}`;
            header.appendChild(teamLabel);
            teamDiv.appendChild(header);

            // 대기실 영역
            const piecesDiv = document.createElement("div");
            piecesDiv.className =
                "flex flex-wrap gap-2 justify-start min-h-[40px] items-center pieces-container";

            // 골인한 말 영역
            const finishedDiv = document.createElement("div");
            finishedDiv.className =
                "mt-2 pt-1 border-t border-gray-300/50 flex flex-wrap gap-1 items-center min-h-[20px] finished-container";
            const finishedLabel = document.createElement("span");
            finishedLabel.textContent = "골인:";
            finishedLabel.className = "text-[10px] text-gray-500 font-bold mr-1";
            finishedDiv.appendChild(finishedLabel);

            // 말 생성
            for (let p = 0; p < pieceCount; p++) {
                const pieceId = `t${t}-p${p}`;
                game.pieces.push({
                    id: pieceId,
                    teamIdx: t,
                    isStacked: false,
                    stackMembers: [pieceId],
                    location: "waiting",
                    boardIdx: -1,
                });

                const pieceEl = createPieceElement(t, p, pieceId);
                attachPieceEvents(pieceEl);
                piecesDiv.appendChild(pieceEl);
            }

            teamDiv.appendChild(piecesDiv);
            teamDiv.appendChild(finishedDiv);
            waitingArea.appendChild(teamDiv);
        }

        const pieceLayer = document.getElementById("pieceLayer");
        if (pieceLayer) pieceLayer.innerHTML = "";

        const finishZone = document.getElementById("finishZone");
        finishZone?.classList.remove("enabled", "active");

        showBigMessage(
            "게임 시작!",
            "말을 드래그하여 판 위에 놓으세요",
            "text-white"
        );
    }, [
        createPieceElement,
        showBigMessage,
        updateUndoButton,
        handleDragStart,
        handleDoubleClick,
    ]);

    const undoLastAction = useCallback(() => {
        const game = gameRef.current;
        if (game.history.length === 0) return;

        const previousState = game.history.pop()!;
        game.pieces = previousState;

        renderAllPieces();
        updateUndoButton();

        document
            .querySelectorAll(".station.highlight")
            .forEach((el) => el.classList.remove("highlight"));
        const finishZone = document.getElementById("finishZone");
        finishZone?.classList.remove("active", "enabled");

        showBigMessage(
            "되돌리기",
            "이전 상태로 복구되었습니다",
            "text-gray-400"
        );
    }, [renderAllPieces, showBigMessage, updateUndoButton]);

    const confirmReset = useCallback(() => {
        if (
            confirm("현재 게임 상태가 모두 사라집니다.\n정말 초기화 하시겠습니까?")
        ) {
            initGame();
        }
    }, [initGame]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {
                console.log(`Fullscreen error: ${e.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    /* ---- 마운트 시 초기화 ---- */
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        // 기기 감지
        const isMobile =
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            );
        if (isMobile) {
            document.body.classList.add("is-mobile");
        } else {
            document.body.classList.add("is-pc");
        }

        initBoard();
        initGame();

        // 이벤트 위임: 초기화/undo/전체화면 버튼
        document
            .getElementById("resetBtn")
            ?.addEventListener("click", confirmReset);
        document
            .getElementById("undoBtn")
            ?.addEventListener("click", undoLastAction);
        document
            .getElementById("fullscreenBtn")
            ?.addEventListener("click", toggleFullscreen);
    }, [confirmReset, initBoard, initGame, toggleFullscreen, undoLastAction]);

    /* ================================================================
       JSX – 원본 HTML 구조를 그대로 유지
       ================================================================ */
    return (
        <>
            {/* 1. 세로 모드 경고 (모바일 전용) */}
            <div
                id="portrait-warning"
                className="fixed inset-0 z-[99999] bg-black/90 text-white flex-col items-center justify-center p-4 text-center"
            >
                <div className="text-6xl mb-4">📱↻</div>
                <h1 className="text-2xl font-bold mb-2">화면을 가로로 돌려주세요</h1>
                <p className="text-gray-400">
                    모바일 환경에서는 가로 모드 플레이를 권장합니다.
                </p>
            </div>

            {/* 2. 액션 메시지 오버레이 */}
            <div
                id="actionOverlay"
                className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] pointer-events-none hidden flex-col items-center justify-center w-full"
            >
                <div
                    id="actionText"
                    className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] stroke-black action-effect text-center whitespace-nowrap"
                >
                    잡았다!
                </div>
                <div
                    id="actionSubText"
                    className="text-2xl md:text-4xl font-bold text-yellow-300 mt-4 drop-shadow-md text-center bg-black/50 px-6 py-2 rounded-full"
                >
                    메시지 내용
                </div>
            </div>

            {/* 3. 메인 게임 영역 */}
            <div
                id="main-game"
                ref={containerRef}
                className="flex flex-row w-full h-full overflow-hidden"
            >
                {/* 왼쪽: 윷놀이 판 */}
                <div
                    id="board-wrapper"
                    className="flex-1 relative flex items-center justify-center p-4 bg-[#fdf6e3]"
                >
                    <div
                        id="boardContainer"
                        className="relative aspect-square h-full max-h-[95vh] board-bg rounded-full border-4 border-amber-800 shadow-2xl"
                    >
                        <svg
                            id="boardSvg"
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            viewBox="0 0 1000 1000"
                        >
                            <path
                                d="M 150 850 L 150 150 L 850 150 L 850 850 Z"
                                stroke="#8b4513"
                                strokeWidth="4"
                                fill="none"
                                opacity="0.6"
                            />
                            <path
                                d="M 150 150 L 850 850"
                                stroke="#8b4513"
                                strokeWidth="4"
                                fill="none"
                                opacity="0.6"
                            />
                            <path
                                d="M 850 150 L 150 850"
                                stroke="#8b4513"
                                strokeWidth="4"
                                fill="none"
                                opacity="0.6"
                            />
                            <g id="stationsGroup"></g>
                            <text
                                x="850"
                                y="930"
                                textAnchor="middle"
                                fontSize="24"
                                fontWeight="bold"
                                fill="#7f1d1d"
                            >
                                출발 / 도착
                            </text>
                        </svg>

                        <div id="pieceLayer" className="absolute inset-0 w-full h-full"></div>

                        <div
                            id="finishZone"
                            className="absolute bottom-[-5%] right-[-15%] w-[25%] h-[25%] exit-zone rounded-full flex flex-col items-center justify-center z-10"
                        >
                            <div className="text-3xl mb-1">🏁</div>
                            <div className="text-sm md:text-base font-black">나기</div>
                            <div className="text-xs opacity-70">여기로 드래그</div>
                        </div>
                    </div>
                </div>

                {/* 오른쪽: 사이드바 */}
                <div
                    id="sidebar"
                    className="w-64 md:w-80 h-full bg-amber-900/10 border-l border-amber-900/20 shadow-lg flex flex-col shrink-0 z-20"
                >
                    <div className="bg-amber-900 text-amber-50 p-3 shadow flex flex-col gap-3 shrink-0">
                        <div className="flex justify-between items-center">
                            <h1 className="font-bold text-lg">윷놀이</h1>
                            <button
                                id="resetBtn"
                                className="text-xs bg-amber-800 hover:bg-red-800 text-amber-200 hover:text-white px-2 py-1 rounded border border-amber-700 transition-colors flex items-center gap-1"
                                title="게임 초기화"
                            >
                                <span>↻</span> 초기화
                            </button>
                        </div>

                        <button
                            id="undoBtn"
                            className="w-full bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black text-sm font-bold px-3 py-3 rounded shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled
                        >
                            <span className="text-lg">↺</span> 방금 행동 되돌리기
                        </button>

                        <button
                            id="fullscreenBtn"
                            className="w-full bg-amber-800 hover:bg-amber-700 active:bg-amber-900 text-amber-100 text-sm font-bold px-3 py-2 rounded shadow transition-colors flex items-center justify-center gap-2 border border-amber-700"
                            title="전체화면 모드로 전환"
                        >
                            <span>⛶</span> 전체화면 모드
                        </button>

                        <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-amber-800/30">
                            <label className="flex flex-col gap-1">
                                <span className="text-amber-200 text-xs">팀 수</span>
                                <select
                                    id="teamCount"
                                    className="text-black font-bold rounded p-1 text-center bg-white border border-amber-700"
                                    defaultValue="2"
                                >
                                    <option value="2">2팀</option>
                                    <option value="3">3팀</option>
                                    <option value="4">4팀</option>
                                    <option value="5">5팀</option>
                                    <option value="6">6팀</option>
                                    <option value="7">7팀</option>
                                    <option value="8">8팀</option>
                                </select>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className="text-amber-200 text-xs">말 개수</span>
                                <select
                                    id="pieceCount"
                                    className="text-black font-bold rounded p-1 text-center bg-white border border-amber-700"
                                    defaultValue="4"
                                >
                                    <option value="1">1개</option>
                                    <option value="2">2개</option>
                                    <option value="3">3개</option>
                                    <option value="4">4개</option>
                                </select>
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 p-2 overflow-y-auto no-scrollbar flex flex-col gap-2">
                        <div className="text-xs font-bold text-amber-900/50 uppercase tracking-widest text-center mt-1 mb-1">
                            대기실 / 골인
                        </div>
                        <div id="waitingArea" className="flex flex-col gap-2 pb-4">
                            {/* 팀별 박스 */}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
