import { useEffect, useState } from 'react';

export const checkboxStates = {
  unchecked: 'unchecked',
  checked: 'checked',
  excluded: 'excluded',
};

export function nextCheckboxState(state) {
  if (state === checkboxStates.unchecked) return checkboxStates.checked;
  if (state === checkboxStates.checked) return checkboxStates.excluded;
  return checkboxStates.unchecked;
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
      excluded: state === checkboxStates.excluded,
      triState: state,
    },
    currentTarget: {
      ...event.currentTarget,
      checked,
      excluded: state === checkboxStates.excluded,
      triState: state,
    },
  };
}

export default function TriStateCheckbox(props) {
  const {
    checked = false,
    className = '',
    excluded = false,
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
      : excluded
        ? checkboxStates.excluded
        : checkboxStates.unchecked;
  const [visualState, setVisualState] = useState(derivedState);

  useEffect(() => {
    if (hasControlledState || checked || excluded) {
      setVisualState(derivedState);
      return;
    }

    setVisualState((currentState) => (
      currentState === checkboxStates.checked ? checkboxStates.unchecked : currentState
    ));
  }, [checked, derivedState, excluded, hasControlledState]);

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
      aria-checked={visualState === checkboxStates.excluded ? 'mixed' : visualState === checkboxStates.checked}
      onChange={handleChange}
    />
  );
}
