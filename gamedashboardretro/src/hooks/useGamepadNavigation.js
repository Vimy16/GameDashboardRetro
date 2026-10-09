import { useEffect, useState } from 'react'

const directionButtons = {
  up: 12,
  down: 13,
  left: 14,
  right: 15,
}

const directionRepeatDelay = 280
const directionRepeatInterval = 160
const scrollDeadzone = 0.18
const maxScrollPerFrame = 12

function isButtonPressed(gamepad, index) {
  const button = gamepad.buttons[index]
  return Boolean(button?.pressed || button?.value > 0.6)
}

function getDirection(gamepad) {
  for (const [direction, buttonIndex] of Object.entries(directionButtons)) {
    if (isButtonPressed(gamepad, buttonIndex)) return direction
  }

  const [horizontalAxis = 0, verticalAxis = 0] = gamepad.axes
  if (Math.abs(verticalAxis) > Math.abs(horizontalAxis) && Math.abs(verticalAxis) > 0.55) {
    return verticalAxis < 0 ? 'up' : 'down'
  }
  if (Math.abs(horizontalAxis) > 0.55) {
    return horizontalAxis < 0 ? 'left' : 'right'
  }
  return null
}

function isVisibleAndEnabled(element) {
  return element.getClientRects().length > 0
    && getComputedStyle(element).visibility !== 'hidden'
    && !element.matches(':disabled, [aria-disabled="true"]')
}

function getFocusableElements() {
  const activeKeyboard = document.activeElement?.closest('.virtual-keyboard-paper')
  const focusScope = activeKeyboard ?? document
  return Array.from(focusScope.querySelectorAll(
    'button:not([data-game-options]), [role="button"], [role="menuitem"], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"]):not([data-game-options])',
  )).filter(isVisibleAndEnabled)
}

function focusElement(element) {
  element.focus({ preventScroll: true })

  const elementRect = element.getBoundingClientRect()
  let scrollContainer = element.parentElement
  while (scrollContainer && scrollContainer !== document.body) {
    const style = getComputedStyle(scrollContainer)
    const scrollsVertically = /(auto|scroll|overlay)/.test(style.overflowY)
      && scrollContainer.scrollHeight > scrollContainer.clientHeight
    const scrollsHorizontally = /(auto|scroll|overlay)/.test(style.overflowX)
      && scrollContainer.scrollWidth > scrollContainer.clientWidth

    if (scrollsVertically || scrollsHorizontally) {
      const containerRect = scrollContainer.getBoundingClientRect()
      let scrollTop = 0
      let scrollLeft = 0

      if (scrollsVertically && elementRect.bottom > containerRect.bottom) {
        scrollTop = elementRect.bottom - containerRect.bottom
      } else if (scrollsVertically && elementRect.top < containerRect.top) {
        scrollTop = elementRect.top - containerRect.top
      }

      if (scrollsHorizontally && elementRect.right > containerRect.right) {
        scrollLeft = elementRect.right - containerRect.right
      } else if (scrollsHorizontally && elementRect.left < containerRect.left) {
        scrollLeft = elementRect.left - containerRect.left
      }

      if (scrollTop || scrollLeft) {
        scrollContainer.scrollBy({ top: scrollTop, left: scrollLeft, behavior: 'smooth' })
      }
      return
    }

    scrollContainer = scrollContainer.parentElement
  }
}

function moveFocus(direction) {
  const focusableElements = getFocusableElements()
  if (!focusableElements.length) return

  const currentElement = document.activeElement
  const currentRect = currentElement?.getBoundingClientRect()
  if (!currentRect || !focusableElements.includes(currentElement)) {
    focusElement(focusableElements[0])
    return
  }

  const currentX = currentRect.left + currentRect.width / 2
  const currentY = currentRect.top + currentRect.height / 2
  const candidates = focusableElements.flatMap((element) => {
    if (element === currentElement) return []
    const rect = element.getBoundingClientRect()
    const deltaX = rect.left + rect.width / 2 - currentX
    const deltaY = rect.top + rect.height / 2 - currentY
    const primaryDistance = direction === 'left' || direction === 'right'
      ? (direction === 'right' ? deltaX : -deltaX)
      : (direction === 'down' ? deltaY : -deltaY)
    if (primaryDistance <= 3) return []

    const crossDistance = direction === 'left' || direction === 'right'
      ? Math.abs(deltaY)
      : Math.abs(deltaX)
    return [{ element, score: primaryDistance + crossDistance * 1.8 }]
  })

  if (candidates.length) {
    candidates.sort((first, second) => first.score - second.score)
    focusElement(candidates[0].element)
    return
  }

  const wrapCandidates = focusableElements
    .filter((element) => element !== currentElement)
    .map((element) => {
      const rect = element.getBoundingClientRect()
      const deltaX = rect.left + rect.width / 2 - currentX
      const deltaY = rect.top + rect.height / 2 - currentY
      const oppositeDistance = direction === 'right'
        ? -deltaX
        : direction === 'left'
          ? deltaX
          : direction === 'down'
            ? -deltaY
            : deltaY
      const crossDistance = direction === 'left' || direction === 'right'
        ? Math.abs(deltaY)
        : Math.abs(deltaX)
      return { element, score: oppositeDistance + crossDistance * 1.8 }
    })
    .sort((first, second) => first.score - second.score)

  if (wrapCandidates[0]) focusElement(wrapCandidates[0].element)
}

function activateFocusedElement() {
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement && activeElement !== document.body) {
    activeElement.click()
  } else {
    getFocusableElements()[0]?.focus()
  }
}

function pressEscape() {
  const target = document.activeElement ?? document.body
  target.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Escape',
    code: 'Escape',
    bubbles: true,
  }))
}

function openFocusedGameOptions() {
  const focusedCard = document.activeElement?.closest('[data-game-card]')
  focusedCard?.querySelector('[data-game-options]')?.click()
}

function scrollWithRightStick(gamepad) {
  const verticalAxis = gamepad.axes[3] ?? 0
  if (Math.abs(verticalAxis) <= scrollDeadzone) return

  const scrollContainer = document.querySelector('.page-content')
  if (!scrollContainer) return

  const normalizedAxis = Math.sign(verticalAxis)
    * (Math.abs(verticalAxis) - scrollDeadzone)
    / (1 - scrollDeadzone)
  const maximumScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight
  scrollContainer.scrollTop = Math.max(
    0,
    Math.min(maximumScroll, scrollContainer.scrollTop + normalizedAxis * maxScrollPerFrame),
  )
}

export default function useGamepadNavigation({ onToggleFullscreen }) {
  const [isConnected, setIsConnected] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    if (!navigator.getGamepads) return undefined

    let animationFrame
    let hideInstructionsTimeout
    let currentGamepadIndex = null
    let nextDirectionMoveAt = 0
    let previousDirection = null
    let previousButtonStates = []

    const updateConnection = (connected) => {
      setIsConnected((previous) => previous === connected ? previous : connected)
    }

    const handleGamepadConnected = (event) => {
      currentGamepadIndex = event.gamepad.index
      previousButtonStates = []
      previousDirection = null
      setShowInstructions(false)
      updateConnection(true)
    }

    const handleGamepadDisconnected = (event) => {
      if (event.gamepad.index !== currentGamepadIndex) return
      currentGamepadIndex = null
      previousButtonStates = []
      previousDirection = null
      window.clearTimeout(hideInstructionsTimeout)
      setShowInstructions(false)
      updateConnection(false)
    }

    const frame = (timestamp) => {
      const gamepads = navigator.getGamepads()
      let gamepad = currentGamepadIndex === null ? null : gamepads[currentGamepadIndex]
      if (!gamepad?.connected) {
        gamepad = Array.from(gamepads).find((candidate) => candidate?.connected) ?? null
        currentGamepadIndex = gamepad?.index ?? null
        previousButtonStates = []
        updateConnection(Boolean(gamepad))
      }

      if (gamepad) {
        scrollWithRightStick(gamepad)

        const direction = getDirection(gamepad)
        if (direction) {
          if (direction !== previousDirection) {
            moveFocus(direction)
            previousDirection = direction
            nextDirectionMoveAt = timestamp + directionRepeatDelay
          } else if (timestamp >= nextDirectionMoveAt) {
            moveFocus(direction)
            nextDirectionMoveAt = timestamp + directionRepeatInterval
          }
        } else {
          previousDirection = null
          nextDirectionMoveAt = 0
        }

        const pressed = (index) => isButtonPressed(gamepad, index)
        const currentButtonStates = gamepad.buttons.map((button) => Boolean(button.pressed || button.value > 0.6))
        if (currentButtonStates.some((isPressed, index) => isPressed && !previousButtonStates[index])) {
          setShowInstructions(true)
          window.clearTimeout(hideInstructionsTimeout)
          hideInstructionsTimeout = window.setTimeout(() => setShowInstructions(false), 5000)
        }
        if (pressed(0) && !previousButtonStates[0]) activateFocusedElement()
        if (pressed(1) && !previousButtonStates[1]) pressEscape()
        if (pressed(2) && !previousButtonStates[2]) openFocusedGameOptions()
        if (pressed(9) && !previousButtonStates[9]) onToggleFullscreen()
        previousButtonStates = currentButtonStates
      }

      animationFrame = requestAnimationFrame(frame)
    }

    window.addEventListener('gamepadconnected', handleGamepadConnected)
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected)
    animationFrame = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.clearTimeout(hideInstructionsTimeout)
      window.removeEventListener('gamepadconnected', handleGamepadConnected)
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected)
    }
  }, [onToggleFullscreen])

  return { isConnected, showInstructions }
}
