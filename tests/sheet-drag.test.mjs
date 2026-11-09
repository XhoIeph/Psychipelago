import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DRAG_THRESHOLD_PX,
  advanceGesture,
  beginGesture,
  resolveTap,
} from '../lib/sheet-drag.ts'

test('non-primary button does not start a gesture', () => {
  assert.equal(beginGesture({ button: 1, inSearchRow: false, isField: false }), null)
})

test('a fast 22px first step activates on that step', () => {
  const gesture = beginGesture({ button: 0, inSearchRow: false, isField: false })
  assert.ok(gesture)
  const step = advanceGesture(gesture, 22)
  assert.equal(step.activated, true)
  assert.equal(step.gesture.active, true)
})

test('movement below the threshold stays in tap state', () => {
  const gesture = beginGesture({ button: 0, inSearchRow: false, isField: false })
  assert.ok(gesture)
  const step = advanceGesture(gesture, DRAG_THRESHOLD_PX - 1)
  assert.equal(step.activated, false)
  assert.equal(step.gesture.active, false)
  assert.equal(resolveTap(step.gesture), 'cycle')
})

test('the threshold is inclusive and activates once', () => {
  const gesture = beginGesture({ button: 0, inSearchRow: true, isField: false })
  assert.ok(gesture)
  const first = advanceGesture(gesture, DRAG_THRESHOLD_PX)
  assert.equal(first.activated, true)
  const second = advanceGesture(first.gesture, DRAG_THRESHOLD_PX + 30)
  assert.equal(second.activated, false)
  assert.equal(second.gesture.active, true)
})

test('field taps restore focus instead of cycling, blank search row does nothing', () => {
  const field = beginGesture({ button: 0, inSearchRow: true, isField: true })
  const blank = beginGesture({ button: 0, inSearchRow: true, isField: false })
  const grab = beginGesture({ button: 0, inSearchRow: false, isField: false })
  assert.ok(field && blank && grab)
  assert.equal(resolveTap(field), 'focus')
  assert.equal(resolveTap(blank), 'none')
  assert.equal(resolveTap(grab), 'cycle')
})

test('a drag never resolves as a tap, even when it ends at the start point', () => {
  const gesture = beginGesture({ button: 0, inSearchRow: false, isField: true })
  assert.ok(gesture)
  const dragged = advanceGesture(gesture, 40).gesture
  const back = advanceGesture(dragged, 0).gesture
  assert.equal(resolveTap(back), 'none')
})

test('moved keeps the largest distance seen', () => {
  const gesture = beginGesture({ button: 0, inSearchRow: false, isField: false })
  assert.ok(gesture)
  const a = advanceGesture(gesture, -37).gesture
  const b = advanceGesture(a, 4).gesture
  assert.equal(b.moved, 37)
})
