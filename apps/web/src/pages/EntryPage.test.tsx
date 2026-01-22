import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntryPage } from './EntryPage';
import { useAuth } from '@/hooks/useAuth';
import * as entryService from '@/services/entry.service';

// Mock hook dependencies
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(),
}));

// Mock service dependencies
vi.mock('@/services/entry.service', () => ({
    getActiveSeason: vi.fn(),
    getUserEntry: vi.fn(),
    createEntry: vi.fn(),
    canEnterDanDivision: vi.fn(),
}));

describe('EntryPage', () => {
    const mockUser = { uid: 'user123', email: 'test@example.com' };
    const mockSeason = { seasonId: 's202401', name: '2024 New Year Season' };

    beforeEach(() => {
        vi.clearAllMocks();
        // Default setup: Authenticated user, loading finished
        (useAuth as any).mockReturnValue({ user: mockUser, loading: false });
        (entryService.getActiveSeason as any).mockResolvedValue(mockSeason);
        (entryService.getUserEntry as any).mockResolvedValue(null); // No entry yet
        (entryService.canEnterDanDivision as any).mockResolvedValue(false); // Only Kyu available
    });

    it('shows loading state initially', () => {
        (useAuth as any).mockReturnValue({ user: null, loading: true });
        render(<EntryPage />);
        expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('redirects to profile/login if not authenticated', () => {
        (useAuth as any).mockReturnValue({ user: null, loading: false });
        render(<EntryPage />);

        expect(screen.getByText('ログインが必要です')).toBeInTheDocument();

        const loginButton = screen.getByText('ログインページへ');
        fireEvent.click(loginButton);
        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('shows message if no active season', async () => {
        (entryService.getActiveSeason as any).mockResolvedValue(null);
        render(<EntryPage />);

        await waitFor(() => {
            expect(screen.getByText('シーズン情報なし')).toBeInTheDocument();
        });
    });

    it('allows entry to Kyu division', async () => {
        render(<EntryPage />);

        // Wait for data load
        await waitFor(() => {
            expect(screen.getByText(`${mockSeason.name} エントリー`)).toBeInTheDocument();
        });

        // Check defaults
        expect(screen.getByText('級位の部')).toBeInTheDocument();
        const submitBtn = screen.getByText('エントリーする');
        expect(submitBtn).toBeDisabled();

        // Select Kyu (already selected default)
        // Check consent box
        const checkbox = screen.getByLabelText(/番付掲載に同意する/);
        fireEvent.click(checkbox);
        expect(submitBtn).toBeEnabled();

        // Submit
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(entryService.createEntry).toHaveBeenCalledWith(mockUser.uid, mockSeason.seasonId, 'kyu');
            expect(mockNavigate).toHaveBeenCalledWith('/official');
        });
    });

    it('allows Dan division selection if eligible', async () => {
        (entryService.canEnterDanDivision as any).mockResolvedValue(true);
        render(<EntryPage />);

        await waitFor(() => {
            expect(screen.getByText('段位の部')).toBeInTheDocument();
        });

        const danButton = screen.getByText('段位の部').closest('button');
        expect(danButton).not.toBeDisabled();

        // Select Dan
        fireEvent.click(danButton!);

        // Consent and submit
        fireEvent.click(screen.getByLabelText(/番付掲載に同意する/));
        fireEvent.click(screen.getByText('エントリーする'));

        await waitFor(() => {
            expect(entryService.createEntry).toHaveBeenCalledWith(mockUser.uid, mockSeason.seasonId, 'dan');
        });
    });

    it('shows already entered state', async () => {
        const enteredEntry = {
            entryId: 'e1',
            seasonId: mockSeason.seasonId,
            userId: mockUser.uid,
            division: 'kyu'
        };
        (entryService.getUserEntry as any).mockResolvedValue(enteredEntry);

        render(<EntryPage />);

        await waitFor(() => {
            expect(screen.getByText('エントリー済み')).toBeInTheDocument();
            expect(screen.getByText(/級位の部でエントリー済みです/)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('公式競技を開始する'));
        expect(mockNavigate).toHaveBeenCalledWith('/official');
    });

    it('handles API errors', async () => {
        (entryService.createEntry as any).mockRejectedValue(new Error('Connection Failed'));
        render(<EntryPage />);

        await waitFor(() => screen.getByText('エントリーする'));

        fireEvent.click(screen.getByLabelText(/番付掲載に同意する/));
        fireEvent.click(screen.getByText('エントリーする'));

        await waitFor(() => {
            expect(screen.getByText('Connection Failed')).toBeInTheDocument();
        });
    });
});
