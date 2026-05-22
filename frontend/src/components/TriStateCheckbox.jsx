import { useEffect, useState } from 'react';

export const checkboxStates = {
  unchecked: 'unchecked',
  checked: 'checked',
};

export function nextCheckboxState(state) {
  return state === checkboxStates.checked ? checkboxStates.unchecked : checkboxStates.checked;
}

function isCheckboxState(value) {
  return Object.values(checkboxStates).includes(value);
}

function eventWithCheckboxState(event, state) {
  const checked = state === checkboxStates.checked;

  return {
    ...event,
    target: {
      ...event.target,
      checked,
      triState: state,
    },
    currentTarget: {
      ...event.currentTarget,
      checked,
      triState: state,
    },
  };
}

export default function TriStateCheckbox(props) {
  const {
    checked = false,
    className = '',
    onChange,
    onStateChange,
    state,
    ...inputProps
  } = props;
  const hasControlledState = isCheckboxState(state);
  const derivedState = hasControlledState
    ? state
    : checked
      ? checkboxStates.checked
      : checkboxStates.unchecked;
  const [visualState, setVisualState] = useState(derivedState);

  useEffect(() => {
    setVisualState(derivedState);
  }, [derivedState]);

  function handleChange(event) {
    const nextState = nextCheckboxState(visualState);

    setVisualState(nextState);
    onStateChange?.(nextState, event);
    onChange?.(eventWithCheckboxState(event, nextState));
  }

  return (
    <input
      {...inputProps}
      type="checkbox"
      checked={visualState === checkboxStates.checked}
      className={`tri-state-checkbox${className ? ` ${className}` : ''}`}
      data-state={visualState}
      aria-checked={visualState === checkboxStates.checked}
      onChange={handleChange}
    />
  );
}
