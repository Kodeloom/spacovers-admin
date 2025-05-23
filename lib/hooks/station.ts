/******************************************************************************
 * This file was generated by ZenStack CLI.
 ******************************************************************************/

/* eslint-disable */
// @ts-nocheck

import type { Prisma, Station } from "@prisma-app/client";
import type { UseMutationOptions, UseQueryOptions, UseInfiniteQueryOptions, InfiniteData } from '@tanstack/vue-query';
import { getHooksContext } from '@zenstackhq/tanstack-query/runtime-v5/vue';
import type { MaybeRefOrGetter, ComputedRef, UnwrapRef } from 'vue';
import { useModelQuery, useInfiniteModelQuery, useModelMutation } from '@zenstackhq/tanstack-query/runtime-v5/vue';
import type { PickEnumerable, CheckSelect, QueryError, ExtraQueryOptions, ExtraMutationOptions } from '@zenstackhq/tanstack-query/runtime-v5';
import type { PolicyCrudKind } from '@zenstackhq/runtime'
import metadata from './__model_meta';
type DefaultError = QueryError;

export function useCreateStation(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(Station | undefined), DefaultError, Prisma.StationCreateArgs, unknown>> | ComputedRef<UseMutationOptions<(Station | undefined), DefaultError, Prisma.StationCreateArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.StationCreateArgs, DefaultError, Station, true>('Station', 'POST', `${endpoint}/station/create`, metadata, options, fetch, true)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.StationCreateArgs>(
            args: Prisma.SelectSubset<T, Prisma.StationCreateArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.StationCreateArgs>, unknown>> | ComputedRef<UseMutationOptions<(CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.StationCreateArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as (CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined);
        },
    };
    return mutation;
}

export function useCreateManyStation(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.StationCreateManyArgs, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.StationCreateManyArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.StationCreateManyArgs, DefaultError, Prisma.BatchPayload, false>('Station', 'POST', `${endpoint}/station/createMany`, metadata, options, fetch, false)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.StationCreateManyArgs>(
            args: Prisma.SelectSubset<T, Prisma.StationCreateManyArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.StationCreateManyArgs>, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.StationCreateManyArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as Prisma.BatchPayload;
        },
    };
    return mutation;
}

export function useFindManyStation<TArgs extends Prisma.StationFindManyArgs, TQueryFnData = Array<Prisma.StationGetPayload<TArgs> & { $optimistic?: boolean }>, TData = TQueryFnData, TError = DefaultError>(args?: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.StationFindManyArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.StationFindManyArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('Station', `${endpoint}/station/findMany`, args, options, fetch);
}

export function useInfiniteFindManyStation<TArgs extends Prisma.StationFindManyArgs, TQueryFnData = Array<Prisma.StationGetPayload<TArgs>>, TData = TQueryFnData, TError = DefaultError>(args?: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.StationFindManyArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.StationFindManyArgs>>, options?: MaybeRefOrGetter<Omit<UseInfiniteQueryOptions<TQueryFnData, TError, InfiniteData<TData>>, 'queryKey' | 'initialPageParam'>> | ComputedRef<Omit<UseInfiniteQueryOptions<TQueryFnData, TError, InfiniteData<TData>>, 'queryKey' | 'initialPageParam'>>) {
    const { endpoint, fetch } = getHooksContext();
    return useInfiniteModelQuery<TQueryFnData, TData, TError>('Station', `${endpoint}/station/findMany`, args, options, fetch);
}

export function useFindUniqueStation<TArgs extends Prisma.StationFindUniqueArgs, TQueryFnData = Prisma.StationGetPayload<TArgs> & { $optimistic?: boolean }, TData = TQueryFnData, TError = DefaultError>(args: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.StationFindUniqueArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.StationFindUniqueArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('Station', `${endpoint}/station/findUnique`, args, options, fetch);
}

export function useFindFirstStation<TArgs extends Prisma.StationFindFirstArgs, TQueryFnData = Prisma.StationGetPayload<TArgs> & { $optimistic?: boolean }, TData = TQueryFnData, TError = DefaultError>(args?: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.StationFindFirstArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.StationFindFirstArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('Station', `${endpoint}/station/findFirst`, args, options, fetch);
}

export function useUpdateStation(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(Station | undefined), DefaultError, Prisma.StationUpdateArgs, unknown>> | ComputedRef<UseMutationOptions<(Station | undefined), DefaultError, Prisma.StationUpdateArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.StationUpdateArgs, DefaultError, Station, true>('Station', 'PUT', `${endpoint}/station/update`, metadata, options, fetch, true)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.StationUpdateArgs>(
            args: Prisma.SelectSubset<T, Prisma.StationUpdateArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.StationUpdateArgs>, unknown>> | ComputedRef<UseMutationOptions<(CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.StationUpdateArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as (CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined);
        },
    };
    return mutation;
}

export function useUpdateManyStation(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.StationUpdateManyArgs, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.StationUpdateManyArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.StationUpdateManyArgs, DefaultError, Prisma.BatchPayload, false>('Station', 'PUT', `${endpoint}/station/updateMany`, metadata, options, fetch, false)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.StationUpdateManyArgs>(
            args: Prisma.SelectSubset<T, Prisma.StationUpdateManyArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.StationUpdateManyArgs>, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.StationUpdateManyArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as Prisma.BatchPayload;
        },
    };
    return mutation;
}

export function useUpsertStation(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(Station | undefined), DefaultError, Prisma.StationUpsertArgs, unknown>> | ComputedRef<UseMutationOptions<(Station | undefined), DefaultError, Prisma.StationUpsertArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.StationUpsertArgs, DefaultError, Station, true>('Station', 'POST', `${endpoint}/station/upsert`, metadata, options, fetch, true)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.StationUpsertArgs>(
            args: Prisma.SelectSubset<T, Prisma.StationUpsertArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.StationUpsertArgs>, unknown>> | ComputedRef<UseMutationOptions<(CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.StationUpsertArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as (CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined);
        },
    };
    return mutation;
}

export function useDeleteStation(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(Station | undefined), DefaultError, Prisma.StationDeleteArgs, unknown>> | ComputedRef<UseMutationOptions<(Station | undefined), DefaultError, Prisma.StationDeleteArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.StationDeleteArgs, DefaultError, Station, true>('Station', 'DELETE', `${endpoint}/station/delete`, metadata, options, fetch, true)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.StationDeleteArgs>(
            args: Prisma.SelectSubset<T, Prisma.StationDeleteArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<(CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.StationDeleteArgs>, unknown>> | ComputedRef<UseMutationOptions<(CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined), DefaultError, Prisma.SelectSubset<T, Prisma.StationDeleteArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as (CheckSelect<T, Station, Prisma.StationGetPayload<T>> | undefined);
        },
    };
    return mutation;
}

export function useDeleteManyStation(options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.StationDeleteManyArgs, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.StationDeleteManyArgs, unknown>> & ExtraMutationOptions), 'mutationFn'>) {
    const { endpoint, fetch } = getHooksContext();
    const _mutation =
        useModelMutation<Prisma.StationDeleteManyArgs, DefaultError, Prisma.BatchPayload, false>('Station', 'DELETE', `${endpoint}/station/deleteMany`, metadata, options, fetch, false)
        ;
    const mutation = {
        ..._mutation,
        mutateAsync: async <T extends Prisma.StationDeleteManyArgs>(
            args: Prisma.SelectSubset<T, Prisma.StationDeleteManyArgs>,
            options?: Omit<(MaybeRefOrGetter<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.StationDeleteManyArgs>, unknown>> | ComputedRef<UseMutationOptions<Prisma.BatchPayload, DefaultError, Prisma.SelectSubset<T, Prisma.StationDeleteManyArgs>, unknown>> & ExtraMutationOptions), 'mutationFn'>
        ) => {
            return (await _mutation.mutateAsync(
                args,
                options as any
            )) as Prisma.BatchPayload;
        },
    };
    return mutation;
}

export function useAggregateStation<TArgs extends Prisma.StationAggregateArgs, TQueryFnData = Prisma.GetStationAggregateType<TArgs>, TData = TQueryFnData, TError = DefaultError>(args: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.StationAggregateArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.StationAggregateArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('Station', `${endpoint}/station/aggregate`, args, options, fetch);
}

export function useGroupByStation<TArgs extends Prisma.StationGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<TArgs>>, Prisma.Extends<'take', Prisma.Keys<TArgs>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? { orderBy: Prisma.StationGroupByArgs['orderBy'] } : { orderBy?: Prisma.StationGroupByArgs['orderBy'] }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<TArgs['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<TArgs['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<TArgs['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends TArgs['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True
    ? `Error: "by" must not be empty.`
    : HavingValid extends Prisma.False
    ? {
        [P in HavingFields]: P extends ByFields
        ? never
        : P extends string
        ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
        : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`,
        ]
    }[HavingFields]
    : 'take' extends Prisma.Keys<TArgs>
    ? 'orderBy' extends Prisma.Keys<TArgs>
    ? ByValid extends Prisma.True
    ? {}
    : {
        [P in OrderFields]: P extends ByFields
        ? never
        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
    }[OrderFields]
    : 'Error: If you provide "take", you also need to provide "orderBy"'
    : 'skip' extends Prisma.Keys<TArgs>
    ? 'orderBy' extends Prisma.Keys<TArgs>
    ? ByValid extends Prisma.True
    ? {}
    : {
        [P in OrderFields]: P extends ByFields
        ? never
        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
    }[OrderFields]
    : 'Error: If you provide "skip", you also need to provide "orderBy"'
    : ByValid extends Prisma.True
    ? {}
    : {
        [P in OrderFields]: P extends ByFields
        ? never
        : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
    }[OrderFields], TQueryFnData = {} extends InputErrors ?
    Array<PickEnumerable<Prisma.StationGroupByOutputType, TArgs['by']> &
        {
            [P in ((keyof TArgs) & (keyof Prisma.StationGroupByOutputType))]: P extends '_count'
            ? TArgs[P] extends boolean
            ? number
            : Prisma.GetScalarType<TArgs[P], Prisma.StationGroupByOutputType[P]>
            : Prisma.GetScalarType<TArgs[P], Prisma.StationGroupByOutputType[P]>
        }
    > : InputErrors, TData = TQueryFnData, TError = DefaultError>(args: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.SubsetIntersection<TArgs, Prisma.StationGroupByArgs, OrderByArg> & InputErrors>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.SubsetIntersection<TArgs, Prisma.StationGroupByArgs, OrderByArg> & InputErrors>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('Station', `${endpoint}/station/groupBy`, args, options, fetch);
}

export function useCountStation<TArgs extends Prisma.StationCountArgs, TQueryFnData = TArgs extends { select: any; } ? TArgs['select'] extends true ? number : Prisma.GetScalarType<TArgs['select'], Prisma.StationCountAggregateOutputType> : number, TData = TQueryFnData, TError = DefaultError>(args?: MaybeRefOrGetter<Prisma.SelectSubset<TArgs, Prisma.StationCountArgs>> | ComputedRef<Prisma.SelectSubset<TArgs, Prisma.StationCountArgs>>, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<TQueryFnData, TError, TData>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<TQueryFnData, TData, TError>('Station', `${endpoint}/station/count`, args, options, fetch);
}

export function useCheckStation<TError = DefaultError>(args: { operation: PolicyCrudKind; where?: { id?: string; name?: string; barcode?: string; description?: string }; }, options?: (MaybeRefOrGetter<Omit<UnwrapRef<UseQueryOptions<boolean, TError, boolean>>, 'queryKey'>> | ComputedRef<Omit<UnwrapRef<UseQueryOptions<boolean, TError, boolean>>, 'queryKey'>> & ExtraQueryOptions)) {
    const { endpoint, fetch } = getHooksContext();
    return useModelQuery<boolean, boolean, TError>('Station', `${endpoint}/station/check`, args, options, fetch);
}
