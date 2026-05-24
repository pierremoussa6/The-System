export function scrollToAppSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;

  const mobileHeader = document.querySelector<HTMLElement>(
    "[data-mobile-app-header='true']"
  );
  const stickyOffset =
    mobileHeader && window.getComputedStyle(mobileHeader).display !== "none"
      ? mobileHeader.offsetHeight + 16
      : 24;
  const top =
    element.getBoundingClientRect().top + window.scrollY - stickyOffset;

  window.scrollTo({
    top: Math.max(0, top),
    behavior: "smooth",
  });
}
