import { supabase } from './supabaseClient';

// Types
export interface Profile {
    id: string;
    user_name: string;
    coop_name: string;
    unit_number: string;
    is_verified: boolean;
    avatar_url?: string;
    role: 'admin' | 'full' | 'limited' | 'blocked';
    building_address: string;
}

export interface AdminUser extends Profile {
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
}

export interface Campaign {
    id: string;
    campaign_name: string;
    description: string;
    price_per_unit: number;
    current_pledges: number;
    min_pledges_needed: number;
    image_url: string;
}

export interface ForumPost {
    id: string;
    post_name: string;
    content: string;
    category: string;
    tags: string[];
    upvotes: number;
    created_at: string;
    user_id: string;
    reply_count?: number;
    is_useful?: boolean;
    deleted_at?: string | null;
}

export interface PackageReport {
    id: string;
    report_type: 'found' | 'lost';
    item_description: string;
    location_found: string;
    status: 'open' | 'resolved';
    created_at: string;
    user_id: string;
    tags: string[];
    package_digits?: string;
    image_url?: string;
    is_food?: boolean;
    additional_notes?: string;
}

export interface UserActivity {
    user_id: string;
    last_seen_forum: string;
    last_seen_events: string;
    last_seen_packages: string;
    last_seen_perks: string;
    last_seen_dashboard: string;
}

export interface Event {
    id: string;
    event_name: string;
    host_organization: string;
    start_time: string;
    end_time: string;
    location: string;
    description: string;
    image_url: string;
    created_by: string;
}

export interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    parent_id?: string | null;
    upvotes?: number;
    is_useful?: boolean;
    deleted_at?: string | null;
    profiles: {
        user_name: string;
        avatar_url: string;
    };
}

export interface Poll {
    id: string;
    question: string;
    description: string;
    created_by: string;
    created_at: string;
    closes_at: string;
    visibility: string;
    options: PollOption[];
    my_vote?: string; // Option ID voted by current user
    total_votes?: number;
}

export interface PollOption {
    id: string;
    poll_id: string;
    option_text: string;
    description?: string;
    image_url?: string;
    vote_count?: number;
    voters?: { user_name: string; avatar_url: string }[];
}

export interface MarketplaceItem {
    id: string;
    item_name: string;
    description: string;
    location: string;
    price?: number;
    is_negotiable: boolean;
    give_away_by: string | null;
    status: 'available' | 'sold' | 'given_away';
    image_url: string | null;
    user_id: string;
    created_at: string;
    profile: {
        user_name: string;
        avatar_url: string;
    };
    contact_email?: string;
    view_count: number;
    like_count: number;
    is_liked_by_me: boolean;
}

export interface DevSupportTicket {
    id: string;
    type: 'bug' | 'feature';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    user_id: string;
    created_at: string;
    updated_at: string;
    user_email?: string;
    upvotes: number;
    is_liked_by_me: boolean;
}

export const api = {
    // User & Profile
    fetchProfile: async (userId: string) => {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        return data as Profile | null;
    },

    fetchUserActivity: async (userId: string) => {
        const { data, error } = await supabase
            .from('user_activity')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (data) return data as UserActivity;

        if (error && error.code === 'PGRST116') {
            const { data: newData } = await supabase
                .from('user_activity')
                .insert({ user_id: userId })
                .select()
                .single();
            return newData as UserActivity | null;
        }
        return null;
    },

    updateLastSeen: async (userId: string, tab: string) => {
        const field = `last_seen_${tab}`;
        const now = new Date().toISOString();
        await supabase
            .from('user_activity')
            .upsert({ user_id: userId, [field]: now });
        return now;
    },

    // Badges
    fetchBadges: async (lastSeen: UserActivity) => {
        const [forum, events, packages] = await Promise.all([
            supabase.from('forum_posts').select('*', { count: 'exact', head: true }).gt('created_at', lastSeen.last_seen_forum),
            supabase.from('events').select('*', { count: 'exact', head: true }).gt('created_at', lastSeen.last_seen_events),
            supabase.from('package_reports').select('*', { count: 'exact', head: true }).gt('created_at', lastSeen.last_seen_packages).eq('status', 'open')
        ]);

        return {
            unreadForum: forum.count || 0,
            unreadEvents: events.count || 0,
            unreadPackages: packages.count || 0
        };
    },

    // Campaigns
    fetchCampaigns: async () => {
        const { data } = await supabase.from('campaigns').select('*');
        return data as Campaign[] | null;
    },

    // Forum
    fetchPosts: async () => {
        const { data } = await supabase
            .from('forum_posts')
            .select(`
                *,
                forum_comments (count)
            `)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!data) return null;

        // Get current user's votes
        const { data: myVotes } = await supabase
            .from('forum_post_votes')
            .select('post_id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        const myVotedPostIds = new Set(myVotes?.map((v: any) => v.post_id));

        return data.map((post: any) => ({
            ...post,
            reply_count: post.forum_comments?.[0]?.count || 0,
            is_useful: myVotedPostIds.has(post.id)
        })) as ForumPost[];
    },

    fetchPostComments: async (postId: string) => {
        const { data } = await supabase
            .from('forum_comments')
            .select(`
                *,
                profiles (user_name, avatar_url)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (!data) return null;

        // Get current user's comment votes
        const { data: myVotes } = await supabase
            .from('forum_comment_votes')
            .select('comment_id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        const myVotedCommentIds = new Set(myVotes?.map((v: any) => v.comment_id));

        return data.map((comment: any) => ({
            ...comment,
            upvotes: comment.upvotes || 0,
            is_useful: myVotedCommentIds.has(comment.id)
        })) as Comment[];
    },

    createPostComment: async (postId: string, userId: string, content: string, parentId?: string) => {
        return await supabase
            .from('forum_comments')
            .insert({ post_id: postId, user_id: userId, content, parent_id: parentId });
    },

    togglePostUseful: async (postId: string, userId: string) => {
        // Check if already voted
        const { data: existingVote } = await supabase
            .from('forum_post_votes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .single();

        if (existingVote) {
            // Remove vote
            await supabase.from('forum_post_votes').delete().eq('id', existingVote.id);
            // Decrement count (manual update for immediate feedback, trigger handles consistency ideally but we do manual here)
            // Actually, let's just use rpc or let the client handle optimistic update. 
            // For simplicity, we'll just update the post count manually.
            const { data: post } = await supabase.from('forum_posts').select('upvotes').eq('id', postId).single();
            if (post) {
                await supabase.from('forum_posts').update({ upvotes: Math.max(0, (post.upvotes || 0) - 1) }).eq('id', postId);
            }
            return { voted: false };
        } else {
            // Add vote
            await supabase.from('forum_post_votes').insert({ post_id: postId, user_id: userId });
            const { data: post } = await supabase.from('forum_posts').select('upvotes').eq('id', postId).single();
            if (post) {
                await supabase.from('forum_posts').update({ upvotes: (post.upvotes || 0) + 1 }).eq('id', postId);
            }
            return { voted: true };
        }
    },

    toggleCommentUseful: async (commentId: string, userId: string) => {
        // Check if already voted
        const { data: existingVote } = await supabase
            .from('forum_comment_votes')
            .select('id')
            .eq('comment_id', commentId)
            .eq('user_id', userId)
            .single();

        if (existingVote) {
            // Remove vote
            await supabase.from('forum_comment_votes').delete().eq('id', existingVote.id);
            const { data: comment } = await supabase.from('forum_comments').select('upvotes').eq('id', commentId).single();
            if (comment) {
                await supabase.from('forum_comments').update({ upvotes: Math.max(0, (comment.upvotes || 0) - 1) }).eq('id', commentId);
            }
            return { voted: false };
        } else {
            // Add vote
            await supabase.from('forum_comment_votes').insert({ comment_id: commentId, user_id: userId });
            const { data: comment } = await supabase.from('forum_comments').select('upvotes').eq('id', commentId).single();
            if (comment) {
                await supabase.from('forum_comments').update({ upvotes: (comment.upvotes || 0) + 1 }).eq('id', commentId);
            }
            return { voted: true };
        }
    },

    deletePost: async (postId: string, userId: string) => {
        return await supabase
            .from('forum_posts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', postId)
            .eq('user_id', userId);
    },

    deleteComment: async (commentId: string, userId: string) => {
        return await supabase
            .from('forum_comments')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', commentId)
            .eq('user_id', userId);
    },

    // Packages
    fetchPackages: async (filterOld: boolean = true) => {
        let query = supabase
            .from('package_reports')
            .select('*')
            .eq('status', 'open')
            .order('created_at', { ascending: false });

        if (filterOld) {
            const fourDaysAgo = new Date();
            fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
            query = query.gt('created_at', fourDaysAgo.toISOString());
        }

        const { data } = await query;
        return data as PackageReport[] | null;
    },

    createPackageReport: async (report: any, imageFile?: File | null) => {
        let imageUrl = null;
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('package_reports')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('package_reports')
                .getPublicUrl(fileName);

            imageUrl = publicUrl;
        }

        return await supabase.from('package_reports').insert({
            ...report,
            image_url: imageUrl
        });
    },

    resolvePackage: async (packageId: string) => {
        return await supabase
            .from('package_reports')
            .update({ status: 'resolved' })
            .eq('id', packageId);
    },

    fetchPackageComments: async (packageId: string) => {
        const { data } = await supabase
            .from('package_comments')
            .select(`
            *,
            profiles (user_name, avatar_url)
        `)
            .eq('package_id', packageId)
            .order('created_at', { ascending: true });
        return data as Comment[] | null;
    },

    createPackageComment: async (packageId: string, userId: string, content: string, parentId?: string) => {
        return await supabase
            .from('package_comments')
            .insert({ package_id: packageId, user_id: userId, content, parent_id: parentId });
    },

    searchProfiles: async (query: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('id, user_name, avatar_url')
            .ilike('user_name', `%${query}%`)
            .limit(5);
        return data as Profile[] | null;
    },

    // Events
    fetchEvents: async () => {
        const now = new Date().toISOString();
        const { data } = await supabase
            .from('events')
            .select('*')
            .gt('start_time', now)
            .order('start_time', { ascending: true });
        return data as Event[] | null;
    },

    createEvent: async (event: any, imageFile?: File | null) => {
        let imageUrl = null;
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('event_images')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('event_images')
                .getPublicUrl(fileName);

            imageUrl = publicUrl;
        }

        return await supabase.from('events').insert({
            ...event,
            image_url: imageUrl
        });
    },

    fetchEventComments: async (eventId: string) => {
        const { data } = await supabase
            .from('event_comments')
            .select(`
                *,
                profiles (user_name, avatar_url)
            `)
            .eq('event_id', eventId)
            .order('created_at', { ascending: true });
        return data as Comment[] | null;
    },

    createEventComment: async (eventId: string, userId: string, content: string) => {
        return await supabase
            .from('event_comments')
            .insert({ event_id: eventId, user_id: userId, content });
    },

    // Polls
    fetchPolls: async (active: boolean | null = true) => {
        const now = new Date().toISOString();
        let query = supabase
            .from('polls')
            .select(`
                *,
                options:poll_options (
                    id,
                    option_text,
                    description,
                    image_url
                )
            `);

        if (active === true) {
            query = query.gt('closes_at', now).order('created_at', { ascending: false });
        } else if (active === false) {
            query = query.lte('closes_at', now).order('closes_at', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data: polls, error } = await query;
        if (error || !polls) return null;

        const pollsWithData = await Promise.all(polls.map(async (poll) => {
            const { count } = await supabase
                .from('poll_votes')
                .select('*', { count: 'exact', head: true })
                .eq('poll_id', poll.id);

            const { data: myVote } = await supabase
                .from('poll_votes')
                .select('option_id')
                .eq('poll_id', poll.id)
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
                .single();

            const optionsWithCounts = await Promise.all(poll.options.map(async (opt: any) => {
                const { count: optCount } = await supabase
                    .from('poll_votes')
                    .select('*', { count: 'exact', head: true })
                    .eq('option_id', opt.id);
                return { ...opt, vote_count: optCount || 0 };
            }));

            return {
                ...poll,
                options: optionsWithCounts,
                total_votes: count || 0,
                my_vote: myVote?.option_id
            };
        }));

        if (!active) {
            pollsWithData.sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0));
        }

        return pollsWithData as Poll[];
    },

    createPoll: async (poll: any, options: any[]) => {
        const { data: pollData, error: pollError } = await supabase
            .from('polls')
            .insert(poll)
            .select()
            .single();

        if (pollError) return { error: pollError };

        const optionsWithPollId = options.map(opt => ({
            ...opt,
            poll_id: pollData.id
        }));

        const { error: optionsError } = await supabase
            .from('poll_options')
            .insert(optionsWithPollId);

        return { data: pollData, error: optionsError };
    },

    castVote: async (pollId: string, optionId: string, userId: string) => {
        const { data: existingVote } = await supabase
            .from('poll_votes')
            .select('id')
            .eq('poll_id', pollId)
            .eq('user_id', userId)
            .single();

        if (existingVote) {
            return await supabase
                .from('poll_votes')
                .update({ option_id: optionId })
                .eq('id', existingVote.id);
        } else {
            return await supabase
                .from('poll_votes')
                .insert({ poll_id: pollId, option_id: optionId, user_id: userId });
        }
    },

    fetchPollDetails: async (pollId: string) => {
        const { data: poll, error } = await supabase
            .from('polls')
            .select(`
                *,
                options:poll_options (
                    id,
                    option_text,
                    description,
                    image_url
                )
            `)
            .eq('id', pollId)
            .single();

        if (error || !poll) return null;

        const optionsWithVoters = await Promise.all(poll.options.map(async (opt: any) => {
            const { data: votes } = await supabase
                .from('poll_votes')
                .select(`
                    user_id,
                    profiles (user_name, avatar_url)
                `)
                .eq('option_id', opt.id);

            const voters = votes?.map((v: any) => ({
                user_name: v.profiles?.user_name || 'Unknown',
                avatar_url: v.profiles?.avatar_url
            })) || [];

            return {
                ...opt,
                vote_count: voters.length,
                voters
            };
        }));

        const { data: myVote } = await supabase
            .from('poll_votes')
            .select('option_id')
            .eq('poll_id', pollId)
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
            .single();

        return {
            ...poll,
            options: optionsWithVoters,
            total_votes: optionsWithVoters.reduce((acc, opt) => acc + opt.vote_count, 0),
            my_vote: myVote?.option_id
        } as Poll;
    },

    fetchPollComments: async (pollId: string) => {
        const { data } = await supabase
            .from('poll_comments')
            .select(`
                *,
                profiles (user_name, avatar_url)
            `)
            .eq('poll_id', pollId)
            .order('created_at', { ascending: true });
        return data as Comment[] | null;
    },

    createPollComment: async (pollId: string, userId: string, content: string, parentId?: string) => {
        return await supabase
            .from('poll_comments')
            .insert({ poll_id: pollId, user_id: userId, content, parent_id: parentId });
    },

    // Marketplace
    fetchMarketplaceItems: async (filterAvailable: boolean = true) => {
        let query = supabase
            .from('marketplace_items')
            .select(`
                *,
                profile:profiles (user_name, avatar_url),
                likes:marketplace_likes (user_id)
            `)
            .order('created_at', { ascending: false });

        if (filterAvailable) {
            const now = new Date().toISOString();
            query = query
                .eq('status', 'available')
                .or(`give_away_by.gt.${now},give_away_by.is.null`);
        }

        const { data } = await query;
        if (!data) return null;

        const { data: { user } } = await supabase.auth.getUser();

        return data.map((item: any) => ({
            ...item,
            like_count: item.likes ? item.likes.length : 0,
            is_liked_by_me: user ? item.likes.some((like: any) => like.user_id === user.id) : false
        })) as MarketplaceItem[];
    },

    createMarketplaceItem: async (item: any, imageFile?: File | null) => {
        let imageUrl = null;
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('marketplace_images')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('marketplace_images')
                .getPublicUrl(fileName);

            imageUrl = publicUrl;
        }

        return await supabase.from('marketplace_items').insert({
            ...item,
            image_url: imageUrl,
            view_count: 0
        });
    },

    updateMarketplaceItemStatus: async (itemId: string, status: string) => {
        return await supabase
            .from('marketplace_items')
            .update({ status })
            .eq('id', itemId);
    },

    incrementMarketplaceItemView: async (itemId: string) => {
        return await supabase.rpc('increment_marketplace_view', { item_id: itemId });
    },

    toggleMarketplaceItemLike: async (itemId: string, userId: string) => {
        const { data } = await supabase
            .from('marketplace_likes')
            .select('item_id')
            .eq('item_id', itemId)
            .eq('user_id', userId)
            .single();

        if (data) {
            return await supabase
                .from('marketplace_likes')
                .delete()
                .eq('item_id', itemId)
                .eq('user_id', userId);
        } else {
            return await supabase
                .from('marketplace_likes')
                .insert({ item_id: itemId, user_id: userId });
        }
    },

    fetchMarketplaceComments: async (itemId: string) => {
        // Fetch comments first
        const { data: comments, error: commentError } = await supabase
            .from('marketplace_comments')
            .select('*')
            .eq('item_id', itemId)
            .order('created_at', { ascending: true });

        if (commentError) {
            console.error('Error fetching comments:', commentError);
            return null;
        }
        if (!comments) return null;

        // Manually fetch profiles to avoid FK dependency issues
        const userIds = [...new Set(comments.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, user_name, avatar_url')
            .in('id', userIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

        const { data: myVotes } = await supabase
            .from('marketplace_comment_votes')
            .select('comment_id')
            .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        const myVotedCommentIds = new Set(myVotes?.map((v: any) => v.comment_id));

        return comments.map((comment: any) => ({
            ...comment,
            profiles: profileMap.get(comment.user_id) || { user_name: 'Unknown', avatar_url: '' },
            upvotes: comment.upvotes || 0,
            is_useful: myVotedCommentIds.has(comment.id)
        })) as Comment[];
    },

    createMarketplaceComment: async (itemId: string, userId: string, content: string, parentId?: string) => {
        return await supabase
            .from('marketplace_comments')
            .insert({ item_id: itemId, user_id: userId, content, parent_id: parentId });
    },

    toggleMarketplaceCommentUseful: async (commentId: string, userId: string) => {
        const { data: existingVote } = await supabase
            .from('marketplace_comment_votes')
            .select('id')
            .eq('comment_id', commentId)
            .eq('user_id', userId)
            .single();

        if (existingVote) {
            await supabase.from('marketplace_comment_votes').delete().eq('id', existingVote.id);
            const { data: comment } = await supabase.from('marketplace_comments').select('upvotes').eq('id', commentId).single();
            if (comment) {
                await supabase.from('marketplace_comments').update({ upvotes: Math.max(0, (comment.upvotes || 0) - 1) }).eq('id', commentId);
            }
            return { voted: false };
        } else {
            await supabase.from('marketplace_comment_votes').insert({ comment_id: commentId, user_id: userId });
            const { data: comment } = await supabase.from('marketplace_comments').select('upvotes').eq('id', commentId).single();
            if (comment) {
                await supabase.from('marketplace_comments').update({ upvotes: (comment.upvotes || 0) + 1 }).eq('id', commentId);
            }
            return { voted: true };
        }
    },

    deleteMarketplaceComment: async (commentId: string, userId: string) => {
        return await supabase
            .from('marketplace_comments')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', commentId)
            .eq('id', commentId)
            .eq('user_id', userId);
    },

    // Dev Support
    fetchDevSupportTickets: async () => {
        const { data } = await supabase
            .from('dev_support_tickets')
            .select(`
                *,
                votes:dev_support_ticket_votes (user_id)
            `)
            .order('created_at', { ascending: false });

        if (!data) return null;

        const { data: { user } } = await supabase.auth.getUser();

        return data.map((ticket: any) => ({
            ...ticket,
            upvotes: ticket.upvotes || 0,
            is_liked_by_me: user ? ticket.votes.some((vote: any) => vote.user_id === user.id) : false
        })) as DevSupportTicket[];
    },

    createDevSupportTicket: async (ticket: Omit<DevSupportTicket, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'upvotes' | 'is_liked_by_me'>, userId: string) => {
        const { data, error } = await supabase
            .from('dev_support_tickets')
            .insert({ ...ticket, user_id: userId })
            .select()
            .single();

        return { data, error };
    },

    toggleDevSupportTicketVote: async (ticketId: string, userId: string) => {
        const { data: existingVote } = await supabase
            .from('dev_support_ticket_votes')
            .select('id')
            .eq('ticket_id', ticketId)
            .eq('user_id', userId)
            .single();

        if (existingVote) {
            await supabase.from('dev_support_ticket_votes').delete().eq('id', existingVote.id);
            const { data: ticket } = await supabase.from('dev_support_tickets').select('upvotes').eq('id', ticketId).single();
            if (ticket) {
                await supabase.from('dev_support_tickets').update({ upvotes: Math.max(0, (ticket.upvotes || 0) - 1) }).eq('id', ticketId);
            }
            return { voted: false };
        } else {
            await supabase.from('dev_support_ticket_votes').insert({ ticket_id: ticketId, user_id: userId });
            const { data: ticket } = await supabase.from('dev_support_tickets').select('upvotes').eq('id', ticketId).single();
            if (ticket) {
                await supabase.from('dev_support_tickets').update({ upvotes: (ticket.upvotes || 0) + 1 }).eq('id', ticketId);
            }
            return { voted: true };
        }
    },

    fetchDevSupportComments: async (ticketId: string) => {
        const { data: comments, error } = await supabase
            .from('dev_support_comments')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error || !comments) return null;

        // Manual profile fetch
        const userIds = [...new Set(comments.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, user_name, avatar_url')
            .in('id', userIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

        return comments.map((comment: any) => ({
            ...comment,
            profiles: profileMap.get(comment.user_id) || { user_name: 'Unknown', avatar_url: '' }
        })) as Comment[];
    },

    createDevSupportComment: async (ticketId: string, userId: string, content: string) => {
        return await supabase
            .from('dev_support_comments')
            .insert({ ticket_id: ticketId, user_id: userId, content });
    },

    // --- Admin Features ---
    fetchAdminUsers: async (): Promise<AdminUser[] | null> => {
        const { data, error } = await supabase.rpc('get_admin_users');
        if (error) {
            console.error('Error fetching admin users:', error);
            return null;
        }
        return data;
    },

    updateUserRole: async (userId: string, newRole: 'admin' | 'full' | 'limited' | 'blocked'): Promise<{ error: any }> => {
        const { error } = await supabase.rpc('update_user_role', {
            target_user_id: userId,
            new_role: newRole
        });
        return { error };
    },

    updateUserVerification: async (userId: string, status: boolean): Promise<{ error: any }> => {
        const { error } = await supabase.rpc('update_user_verification', {
            target_user_id: userId,
            status: status
        });
        return { error };
    }
};
