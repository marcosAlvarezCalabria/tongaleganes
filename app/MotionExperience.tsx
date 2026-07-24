"use client";

import { useEffect } from "react";

export function MotionExperience() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const parallaxItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    const hero = document.querySelector<HTMLElement>("[data-scroll-hero]");
    const video = document.querySelector<HTMLVideoElement>("[data-scroll-video]");

    if (!hero || !video) {
      return;
    }

    let frameId = 0;
    let duration = 0;

    const update = () => {
      frameId = 0;

      if (reducedMotion.matches) {
        hero.style.setProperty("--hero-progress", "0");
        parallaxItems.forEach((item) => item.style.setProperty("--parallax-y", "0px"));
        video.currentTime = 0;
        return;
      }

      const viewportHeight = window.innerHeight;
      const heroRect = hero.getBoundingClientRect();
      const travel = Math.max(heroRect.height - viewportHeight, 1);
      const heroProgress = Math.min(Math.max(-heroRect.top / travel, 0), 1);
      hero.style.setProperty("--hero-progress", heroProgress.toFixed(4));

      if (duration > 0 && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        const nextTime = heroProgress * Math.max(duration - 0.05, 0);
        if (Math.abs(video.currentTime - nextTime) > 0.025) {
          video.currentTime = nextTime;
        }
      }

      parallaxItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportHeight) {
          return;
        }

        const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
        const offset = (progress - 0.5) * 54;
        item.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
      });
    };

    const requestUpdate = () => {
      if (frameId === 0) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    const handleMetadata = () => {
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      update();
    };

    video.pause();
    video.addEventListener("loadedmetadata", handleMetadata);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reducedMotion.addEventListener("change", requestUpdate);

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      handleMetadata();
    } else {
      requestUpdate();
    }

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      video.removeEventListener("loadedmetadata", handleMetadata);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
    };
  }, []);

  return null;
}
