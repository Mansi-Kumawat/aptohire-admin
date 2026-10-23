import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { useState } from 'react';
import { Modal } from '../frontend/src/components/ui';

afterEach(cleanup);

describe('accessible modal keyboard behavior', () => {
  it('keeps focus inside, cycles through controls, and restores focus on Escape', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return <>
        <button onClick={() => setOpen(true)}>Open dialog</button>
        {open ? <Modal title="Test dialog" onClose={() => setOpen(false)} footer={<>
          <button onClick={() => setOpen(false)}>Cancel</button>
          <button onClick={() => setOpen(false)}>Continue</button>
        </>}><p>Dialog content</p></Modal> : null}
      </>;
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    await user.click(opener);
    const title = screen.getByRole('heading', { name: 'Test dialog' });
    const close = screen.getByRole('button', { name: 'Close dialog' });
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(document.activeElement).toBe(title);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(continueButton);
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(continueButton);
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
