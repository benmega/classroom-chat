import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ContributionGraph from './ContributionGraph';

const data = {
    months: [{ name: 'Jan', colspan: 1 }, { name: 'Feb', colspan: 3 }],
    rows: [
        [null, { date: '2026-01-04', count: 0, level: 0 }, { date: '2026-01-11', count: 1, level: 1 }],
        [null, { date: '2026-01-05', count: 3, level: 2 }, null],
    ],
};

const cells = (container) => Array.from(container.querySelectorAll('.graph-row .graph-cell'));

describe('ContributionGraph', () => {
    it('shows a fallback when there is no data', () => {
        const { container: a } = render(<ContributionGraph data={null} />);
        expect(a).toHaveTextContent('No activity data available.');
        const { container: b } = render(<ContributionGraph data={{}} />);
        expect(b).toHaveTextContent('No activity data available.');
    });

    it('describes each day in its tooltip with a plural-aware count', () => {
        const { container } = render(<ContributionGraph data={data} />);
        const titles = cells(container).map((c) => c.getAttribute('title'));

        expect(titles).toEqual([
            null,
            '0 challenges on 2026-01-04',
            '1 challenge on 2026-01-11',
            null,
            '3 challenges on 2026-01-05',
            null,
        ]);
    });

    it('gives padding cells no tooltip and the empty level class', () => {
        const { container } = render(<ContributionGraph data={data} />);
        const padding = cells(container).filter((c) => !c.hasAttribute('title'));

        expect(padding).toHaveLength(3);
        padding.forEach((c) => expect(c).toHaveClass('level-0'));
    });

    it('applies the level class of each cell', () => {
        const { container } = render(<ContributionGraph data={data} />);

        expect(cells(container)[2]).toHaveClass('level-1');
        expect(cells(container)[4]).toHaveClass('level-2');
    });

    it('treats a missing count as zero', () => {
        const { container } = render(<ContributionGraph data={{ rows: [[{ date: '2026-02-01', level: 0 }]] }} />);

        expect(cells(container)[0].getAttribute('title')).toBe('0 challenges on 2026-02-01');
    });

    it('renders month labels, hiding a cramped leading month', () => {
        const { container } = render(<ContributionGraph data={data} />);
        const labels = Array.from(container.querySelectorAll('.month-label')).map((l) => l.textContent);

        expect(labels).toEqual(['', 'Feb']);
    });

    it('renders without a months list', () => {
        const { container } = render(<ContributionGraph data={{ rows: [[null]] }} />);

        expect(container.querySelectorAll('.month-label')).toHaveLength(0);
        expect(container.querySelector('.graph-footer')).not.toBeNull();
    });
});
