import AnalyticsEvent from '../models/AnalyticsEvent';

export async function trackEvent(event: string, userId?: string, metadata?: Record<string, any>) {
    try {
        await AnalyticsEvent.create({
            event,
            userId,
            metadata,
        });
    } catch (error) {
        console.error('Failed to track analytics event', error);
    }
}

export async function getAnalyticsSummary(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [eventsByType, dailyEvents] = await Promise.all([
        AnalyticsEvent.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: '$event', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        AnalyticsEvent.aggregate([
            { $match: { createdAt: { $gte: since } } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt',
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } },
        ])
    ]);

    return {
        since,
        eventsByType,
        dailyEvents,
    };
}
