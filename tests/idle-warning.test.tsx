import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IdleTimeoutWarning } from '../frontend/src/app/providers';

afterEach(cleanup);

describe('idle timeout warning keyboard behavior', () => {
  it('traps focus, cannot be dismissed with Escape, and returns focus when resolved', async () => {
    const user = userEvent.setup();
    const staySignedIn = vi.fn();
    const signOut = vi.fn();
    function Harness() {
      const [visible, setVisible] = useState(false);
      return <>
        <button onClick={() => setVisible(true)}>Previous page action</button>
        {visible ? <IdleTimeoutWarning onStaySignedIn={() => { staySignedIn(); setVisible(false); }} onSignOut={signOut} /> : null}
      </>;
    }

    render(<Harness />);
    const previousButton = screen.getByRole('button', { name: 'Previous page action' });
    await user.click(previousButton);
    const stayButton = screen.getByRole('button', { name: 'Stay signed in' });
    const signOutButton = screen.getByRole('button', { name: 'Sign out now' });
    expect(document.activeElement).toBe(stayButton);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(signOutButton);
    await user.tab();
    expect(document.activeElement).toBe(stayButton);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(stayButton);
    expect(staySignedIn).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(previousButton).toHaveFocus();
  });
});
