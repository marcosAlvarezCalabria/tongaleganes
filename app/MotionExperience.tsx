"use client";

import { useEffect } from "react";

const FRAME_COUNT = 238;
const PRELOAD_CONCURRENCY = 4;

function framePath(frame: number): string {
  return `/frames/hero/frame-${String(frame).padStart(3, "0")}.webp`;
}

export function MotionExperience() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const parallaxItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    const hero = document.querySelector<HTMLElement>("[data-scroll-hero]");
    const frameImage = document.querySelector<HTMLImageElement>("[data-scroll-frame]");
    const loader = document.querySelector<HTMLElement>("[data-frame-loader]");

    if (!hero || !frameImage) {
      return;
    }

    let animationFrameId = 0;
    let currentFrame = 1;
    let cancelled = false;
    const loadedFrames = new Set<number>([1]);

    const closestLoadedFrame = (target: number): number => {
      if (loadedFrames.has(target)) {
        return target;
      }

      for (let distance = 1; distance < FRAME_COUNT; distance += 1) {
        const previous = target - distance;
        const next = target + distance;
        if (previous >= 1 && loadedFrames.has(previous)) {
          return previous;
        }
        if (next <= FRAME_COUNT && loadedFrames.has(next)) {
          return next;
        }
      }

      return 1;
    };

    const update = () => {
      animationFrameId = 0;

      if (reducedMotion.matches) {
        hero.style.setProperty("--hero-progress", "0");
        parallaxItems.forEach((item) => item.style.setProperty("--parallax-y", "0px"));
        if (currentFrame !== 1) {
          currentFrame = 1;
          frameImage.src = framePath(1);
        }
        return;
      }

      const viewportHeight = window.innerHeight;
      const heroRect = hero.getBoundingClientRect();
      const travel = Math.max(heroRect.height - viewportHeight, 1);
      const heroProgress = Math.min(Math.max(-heroRect.top / travel, 0), 1);
      hero.style.setProperty("--hero-progress", heroProgress.toFixed(4));

      const desiredFrame = 1 + Math.round(heroProgress * (FRAME_COUNT - 1));
      const nextFrame = closestLoadedFrame(desiredFrame);
      if (nextFrame !== currentFrame) {
        currentFrame = nextFrame;
        frameImage.src = framePath(nextFrame);
      }

      parallaxItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportHeight) {
          return;
        }

        const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
        const speed = Number(item.dataset.parallaxSpeed ?? 54);
        const offset = (progress - 0.5) * speed;
        item.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
      });
    };

    const requestUpdate = () => {
      if (animationFrameId === 0) {
        animationFrameId = window.requestAnimationFrame(update);
      }
    };

    const preload = async () => {
      if (reducedMotion.matches) {
        loader?.setAttribute("data-ready", "true");
        return;
      }

      const initialFrames = Array.from({ length: 39 }, (_, index) => index + 2);
      const keyFrames = Array.from(
        { length: Math.floor((FRAME_COUNT - 40) / 8) + 1 },
        (_, index) => 40 + index * 8,
      ).filter((frame) => frame <= FRAME_COUNT);
      const prioritized = new Set([...initialFrames, ...keyFrames]);
      const remainingFrames = Array.from(
        { length: FRAME_COUNT - 1 },
        (_, index) => index + 2,
      ).filter((frame) => !prioritized.has(frame));
      const preloadOrder = [...prioritized, ...remainingFrames];
      let queueIndex = 0;

      const yieldToBrowser = () =>
        new Promise<void>((resolve) => {
          if ("requestIdleCallback" in window) {
            window.requestIdleCallback(() => resolve(), { timeout: 80 });
            return;
          }
          globalThis.setTimeout(resolve, 16);
        });

      const worker = async () => {
        while (!cancelled && queueIndex < preloadOrder.length) {
          const frame = preloadOrder[queueIndex];
          queueIndex += 1;

          await new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => {
              void image.decode().then(() => {
                if (cancelled) {
                  return;
                }
                loadedFrames.add(frame);
                const progress = Math.round((loadedFrames.size / FRAME_COUNT) * 100);
                loader?.style.setProperty("--frames-loaded", (progress / 100).toFixed(3));
                loader?.setAttribute("aria-label", `Secuencia visual cargada al ${progress}%`);
              }).catch(() => undefined).finally(() => {
                resolve();
              });
            };
            image.onerror = () => resolve();
            image.src = framePath(frame);
          });

          requestUpdate();
          if (frame > 40) {
            await yieldToBrowser();
          }
        }
      };

      await Promise.all(
        Array.from({ length: PRELOAD_CONCURRENCY }, () => worker()),
      );

      if (!cancelled) {
        loader?.setAttribute("data-ready", "true");
        loader?.setAttribute("aria-label", "Secuencia visual lista");
      }
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reducedMotion.addEventListener("change", requestUpdate);
    requestUpdate();
    void preload();

    return () => {
      cancelled = true;
      if (animationFrameId !== 0) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
    };
  }, []);

  return null;
}
